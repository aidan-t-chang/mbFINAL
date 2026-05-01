"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUser, getGameQuestions, cleanUpQuestions, saveGameResults } from "../../actions";
import Link from "next/link";
import toast from "react-hot-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import XpBar from "./XpBar";

export default function ActiveGame({ socket }: { socket: WebSocket | null }, isCustomLobby?: boolean) {
    const { roomId } = useParams();
    const router = useRouter();
    const [questions, setQuestions] = useState<{ question: string, correctAnswer: number }[]>([]);

    const { data: user, isLoading: isUserLoading } = useQuery({
        queryKey: ["currentUser"],
        queryFn: getCurrentUser,
    });

    const [questionsReady, setQuestionsReady] = useState(false);

    const { data: fetchedQuestions, isLoading: areQuestionsLoading } = useQuery({
        queryKey: ["questions", roomId],
        queryFn: () => getGameQuestions(roomId as string),
        enabled: questionsReady && !!roomId,
    });

    useEffect(() => {
        if (fetchedQuestions) {
            setQuestions(fetchedQuestions);
        }
    }, [fetchedQuestions]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentInput, setCurrentInput] = useState("");
    const [myScore, setMyScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [opponentUsername, setOpponentUsername] = useState("");
    const [opponentCombo, setOpponentCombo] = useState(0);
    const [opponentComboLevel, setOpponentComboLevel] = useState(1);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameOver, setGameOver] = useState(false);
    const [combo, setCombo] = useState(0);
    const [comboLevel, setComboLevel] = useState(1);
    const [maxCombo, setMaxCombo] = useState(0);
    const [isInputDisabled, setIsInputDisabled] = useState(false);
    const [xpData, setXpData] = useState<{ expGained: number, oldTotalExp: number, newTotalExp: number } | null>(null);
    const [isWinner, setIsWinner] = useState(false);

    const [scoreHistory, setScoreHistory] = useState<{ time: number, myScore: number, opponentScore: number }[]>([
        { time: 60, myScore: 0, opponentScore: 0 }
    ]);

    const questionStartTime = useRef<number>(Date.now());

    useEffect(() => {
        questionStartTime.current = Date.now();
    }, [currentIndex]);

    useEffect(() => {
        if (!user) {
            return;
        }

        if (!user && !isUserLoading) {
            router.push("/login");
            return;
        }

        if (socket) {
            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === "QUESTIONS_READY") {
                    setQuestionsReady(true);
                }

                if (data.type === "GAME_ACTION" && data.user.id !== user.id) {
                    if (!opponentUsername) {
                        setOpponentUsername(data.user.username);
                    }
                    if (data.action === "CORRECT_ANSWER") {
                        if (data.score !== undefined) {
                            setOpponentScore(data.score);
                        }
                        if (data.combo !== undefined) {
                            setOpponentCombo(data.combo);
                        }
                        if (data.comboLevel !== undefined) {
                            setOpponentComboLevel(data.comboLevel);
                        }
                    }
                }
            }
        }
    }, [user, isUserLoading, router, socket, roomId, opponentUsername]);

    // useEffect(() => {
    //     async function setUpGame() {
    //         const currentUser = await getCurrentUser();
    //         if (!currentUser) {
    //             return router.push("/login");
    //         }

    //         if (socket) {
    //             socket.onmessage = async (event) => {
    //                 const data = JSON.parse(event.data);

    //                 if (data.type === "QUESTIONS_READY") {
    //                     const gameQuestions = await getGameQuestions(roomId as string);
    //                     setQuestions(gameQuestions);
    //                 }

    //                 if (data.type === "GAME_ACTION" && data.user.id !== currentUser.id) {
    //                     if (!opponentUsername) {
    //                         setOpponentUsername(data.user.username);
    //                     }
    //                     if (data.action === "CORRECT_ANSWER") {
    //                         if (data.score !== undefined) {
    //                             setOpponentScore(data.score);
    //                         }
    //                         if (data.combo !== undefined) {
    //                             setOpponentCombo(data.combo);
    //                         } 
    //                         if (data.comboLevel !== undefined) {
    //                             setOpponentComboLevel(data.comboLevel);
    //                         }
    //                     }
    //                 }
    //             };
    //         }
    //     }
    //     setUpGame();
    // }, [roomId, router, socket]);

    useEffect(() => {
        if (!user || questions.length === 0 || gameOver) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setGameOver(true);
                    return 0;
                }
                return prev - 1;
            })
        }, 1000);

        return () => clearInterval(timer);
    }, [user, questions, gameOver]);

    useEffect(() => {
        // clean up questions
        async function handleGameOver() {
            if (gameOver) {
                const isWinner = myScore > opponentScore;
                const result = await saveGameResults(roomId as string, myScore, isWinner, maxCombo, currentIndex);

                if (result && result.success) {
                    setXpData({
                        expGained: result.expGained as number,
                        oldTotalExp: result.oldTotalExp as number,
                        newTotalExp: result.newTotalExp as number,
                    });
                }

                if (myScore >= opponentScore) {
                    cleanUpQuestions(roomId as string, currentIndex);
                }

                setScoreHistory(prev => [...prev, { time: 0, myScore, opponentScore }]);
            }
        }
        handleGameOver();
    }, [gameOver, currentIndex, roomId, myScore, opponentScore]);

    useEffect(() => {
        if (myScore > 0 || opponentScore > 0) {
            setScoreHistory(prev => [...prev, { time: timeLeft, myScore, opponentScore}]);
            setIsWinner(myScore > opponentScore);
        }
    }, [myScore, opponentScore]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user) {
            return;
        }

        const val = e.target.value.replace(/[^0-9-]/g, ""); // only allow numbers and negative
        setCurrentInput(val);

        const currentQuestion = questions[currentIndex];
        if (!currentQuestion) return;

        const expectedAnswerString = currentQuestion.correctAnswer.toString();

        if (val.length >= expectedAnswerString.length) {
            // check if current input is correct
            if (currentQuestion && parseInt(val) === currentQuestion.correctAnswer) {

                const elapsedMs = Date.now() - questionStartTime.current;
                
                let baseScore = 1000;
                if (elapsedMs > 500) {
                    baseScore -= Math.floor((elapsedMs - 500) * 0.05); // after 500 ms, lose 1 point every 20 ms
                }

                baseScore = Math.max(50, baseScore);

                const newCombo = combo + 1;
                const newComboLevel = (newCombo % 3 === 0) ? comboLevel + 0.5 : comboLevel;
                const newScore = myScore + Math.round((baseScore * newComboLevel));

                setCurrentInput("");
                setCurrentIndex((prev) => prev + 1);
                setCombo(newCombo)
                setComboLevel(newComboLevel);
                setMyScore(newScore);
                setMaxCombo((prev) => Math.max(prev, newCombo));
                
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: "GAME_ACTION",
                        action: "CORRECT_ANSWER",
                        score: newScore,
                        combo: newCombo,
                        comboLevel: newComboLevel,
                        user: { id: user.id, username: user.username }
                    }));
                }
            } else {
                // time penalty + combo reset to 0
                console.log("wrong answer");
                setCurrentInput("");
                setCombo(0);
                setComboLevel(1);

                setIsInputDisabled(true);
                setTimeout(() => {
                    setIsInputDisabled(false);
                }, 1500);
            }
        }
    };

    if (isUserLoading || areQuestionsLoading || !user || questions.length === 0) {
        return (<>
            <div className="flex flex-col items-center justify-center h-screen">
                <h2 className="text-2xl font-bold mb-4">Loading game...</h2>
            </div>
            </>)
    }

    if (gameOver) {
        return (
            <div className="game-over-screen text-center">
                <h1 className="text-4xl font-bold mb-6">Game Over</h1>
                <p>your score: {myScore}</p>
                <p>opponent score: {opponentScore}</p>
                {myScore > opponentScore && <p className="text-green-500">you win</p>}
                {myScore < opponentScore && <p className="text-red-500">you lose</p>}
                <p>you answered {currentIndex} questions</p>
                <p>max combo: {maxCombo}</p>

                <p>base xp: {Math.floor(myScore * 0.1)}</p>
                <p>question bonus: {currentIndex * 25}</p>
                <p>combo bonus: {maxCombo * 50}</p>
                <p>win bonus: {isWinner ? 1000 : 0}</p>
                <p>total xp gained: {xpData ? xpData.expGained : "calculating..."}</p>
                {/* eventually show mbrr increase after implementation of glicko2 rating*/}
                {xpData ? (
                    <XpBar user={user} xpData={xpData} />
                ) : (
                    <p className="text-sm">calculating xp...</p>
                )}
                <div className="graph-container">
                    <h3 className="text-center">score history</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={scoreHistory}>
                            <XAxis dataKey="time" type="number" domain={([0, 60])} reversed={true} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="stepAfter" dataKey="myScore" stroke="#8884d8" dot={false} isAnimationActive={true} name={user.username}/>
                            <Line type="stepAfter" dataKey="opponentScore" stroke="#82ca9d" dot={false} isAnimationActive={true} name={opponentUsername || "Opponent"}/>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <Link href="/">Return to Lobby</Link>
            </div>
        )
    }

    const currentQuestion = questions[currentIndex];
    return (
        <div className="active-game-container flex flex-col items-center justify-center h-screen text-center">
            <div className="active-game-container">
                <div className="game-header">
                    {/* time left is probably going to be a progress bar*/}
                    <div className="score-board">
                        <p>{user.username}: {myScore}</p>
                        <p>{opponentUsername}: {opponentScore}</p>
                    </div>
                    <div className="other-info">
                        <p>Time Left: {timeLeft}s</p>
                        <div className="w-full bg-gray-200 h-3 mt-1 mb-2 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-3 rounded-full transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 60) * 100}%` }}></div>
                        </div>
                        <p>Combo: {combo} (x{comboLevel.toFixed(1)})</p>
                    </div>
                </div>
            </div>

            <div className="questions-container">
                <h1 className="cur-question">{currentQuestion?.question}</h1>
                <input 
                    type="text"
                    value={currentInput}
                    onChange={handleInputChange}
                    autoFocus
                    className="answer-input"
                    style={{ opacity: isInputDisabled ? 0.5 : 1,
                        backgroundColor: isInputDisabled ? "#f8d7da" : "white",
                    }}
                />
            </div>
        </div>
    )
}
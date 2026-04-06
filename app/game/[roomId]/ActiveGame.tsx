"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUser, getGameQuestions, cleanUpQuestions, saveGameResults } from "../../actions";
import toast from "react-hot-toast";

export default function ActiveGame({ socket }: { socket: WebSocket | null }) {
    const { roomId } = useParams();
    const router = useRouter();

    const [user, setUser] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentInput, setCurrentInput] = useState("");
    const [myScore, setMyScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameOver, setGameOver] = useState(false);

    useEffect(() => {
        async function setUpGame() {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                return router.push("/login");
            }
            setUser(currentUser);

            if (socket) {
                socket.onmessage = async (event) => {
                    const data = JSON.parse(event.data);

                    if (data.type === "QUESTIONS_READY") {
                        const gameQuestions = await getGameQuestions(roomId as string);
                        setQuestions(gameQuestions);
                    }

                    if (data.type === "GAME_ACTION" && data.user.id !== currentUser.id) {
                        if (data.action === "CORRECT_ANSWER") {
                            // figure out what to scale score by
                            setOpponentScore((prev) => prev + 1);
                        }
                    }
                };
            }
        }
        setUpGame();
    }, [roomId, router, socket]);

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
        if (gameOver) {
            const isWinner = myScore > opponentScore;
            saveGameResults(roomId as string, myScore, isWinner);

            if (myScore >= opponentScore) {
                cleanUpQuestions(roomId as string, currentIndex);
            }
        }
    }, [gameOver, currentIndex, roomId, myScore, opponentScore]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9-]/g, ""); // only allow numbers and negative
        setCurrentInput(val);

        const currentQuestion = questions[currentIndex];
        if (!currentQuestion) return;

        const expectedAnswerString = currentQuestion.correctAnswer.toString();

        if (val.length >= expectedAnswerString.length) {

            // check if current input is correct
            if (currentQuestion && parseInt(val) === currentQuestion.correctAnswer) {
                setCurrentInput("");
                setCurrentIndex((prev) => prev + 1)
                // implement combo scoring later and decide the scale of scoring (100, 1000, etc)
                setMyScore(prev => prev + 1);

                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: "GAME_ACTION",
                        action: "CORRECT_ANSWER",
                        user: { id: user.id, username: user.username }
                    }));
                }
            } else {
                // time penalty + combo reset to 0
                console.log("wrong answer");
                setCurrentInput("");
            }
        }
    };

    if (!user || questions.length === 0) {
        return (<>
            <div className="flex flex-col items-center justify-center h-screen">
                <h2 className="text-2xl font-bold mb-4">Loading game...</h2>
            </div>
            </>)
    }

    if (gameOver) {
        return (
            <div className="game-over-screen">
                <h1 className="text-4xl font-bold mb-6">Game Over</h1>
                <p>your score: {myScore}</p>
                <p>opponent score: {opponentScore}</p>
                {myScore > opponentScore && <p className="text-green-500">you win</p>}
                {myScore < opponentScore && <p className="text-red-500">you lose</p>}
                {/* show other things, like highest combo, score, # questions answered, graph of points? */}
                {/* add "return to lobby" button, automatically save to DB after game finishes? */}
            </div>
        )
    }

    const currentQuestion = questions[currentIndex];
    return (
        <>
            <div className="active-game-container">
                <div className="game-header">
                    {/* time left is probably going to be a progress bar*/}
                    <div className="score-board">
                        <p>{user.username}: {myScore}</p>
                        <p>opponent: {opponentScore}</p>
                        {/* store opponent username too? + combo stuff*/}
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
                />
            </div>
        </>
    )
}
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUser, cleanUpQuestions, createSoloGame } from "../../actions";
import { useQuery } from "@tanstack/react-query";
import { generateEzAddition } from "../../actions";
import { saveRaceScore } from "../../actions";
import XpBar from "./XpBar";
import Link from "next/link";

// the race gamemode: answer 20 easy addition problems as fast as you can

export default function ActiveRaceGame() {
    const { roomId } = useParams();
    const router = useRouter();
    
    const [questions, setQuestions] = useState<{ question: string, correctAnswer: number }[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentInput, setCurrentInput] = useState("");
    const [questionsAnswered, setQuestionsAnswered] = useState(0); // number of questions completed
    const [isInputDisabled, setIsInputDisabled] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [timeTaken, setTimeTaken] = useState(0);
    const [gameStarted, setGameStarted] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const [xpData, setXpData] = useState<{ expGained: number, oldTotalExp: number, newTotalExp: number } | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    const { data: user, isLoading: isUserLoading } = useQuery({
        queryKey: ["currentUser"],
        queryFn: getCurrentUser,
    });

    useEffect(() => {
        if (roomId && user) {
            createSoloGame(roomId as string, "race");
        }
    }, [roomId, user]);

    // fetch first 50 questions
    const { data: initialQuestions, isLoading: areQuestionsLoading } = useQuery({
        queryKey: ["raceQuestions", roomId],
        queryFn: () => generateEzAddition(roomId as string, 20),
        enabled: !!roomId,
    });

    // Populate questions when they arrive
    useEffect(() => {
        if (initialQuestions) {
            setQuestions(initialQuestions as any);
        }
    }, [initialQuestions]);

    // Handle countdown after questions are loaded
    useEffect(() => {
        if (questions.length > 0 && !gameStarted) {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                setGameStarted(true);
            }
        }
    }, [questions.length, countdown, gameStarted]);

    // Handle time taken timer
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (gameStarted && !gameOver) {
            timer = setInterval(() => {
                setTimeTaken(prev => prev + 10); // track in 10ms increments (or whatever format you prefer)
            }, 10);
        }
        return () => clearInterval(timer);
    }, [gameStarted, gameOver]);

    useEffect(() => {
        if (gameOver) {
            saveRaceScore(roomId as string, timeTaken, questionsAnswered).then(res => {
                if (res?.success) {
                    console.log("Race score saved", res);
                    setXpData({
                        expGained: res.expGained as number,
                        oldTotalExp: res.oldTotalExp as number,
                        newTotalExp: res.newTotalExp as number,
                    });
                }
            });
        }
    }, [gameOver, roomId, questionsAnswered, timeTaken]);

    useEffect(() => {
        async function fetchMoreQuestions() {
            if (questions.length > 0 && currentIndex >= questions.length - 10 && !isFetchingMore && !gameOver) {
                setIsFetchingMore(true);
                const moreQs = await generateEzAddition(roomId as string, 50);
                if (moreQs) {
                    setQuestions(prev => [...prev, ...(moreQs as any)]);
                }
                setIsFetchingMore(false);
            }
        }
        fetchMoreQuestions();
    }, [currentIndex, questions.length, roomId, isFetchingMore]);
    
    // Protect against non-auth or loading
    if (!user && !isUserLoading) router.push("/login");
    if (isUserLoading || questions.length === 0 || areQuestionsLoading) {
        return <div className="flex h-screen items-center justify-center">Loading Survival Batch...</div>;
    }

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (gameOver || isInputDisabled || !gameStarted) return;
        
        // Match the number-only filter exactly from ActiveGame.tsx
        const val = e.target.value.replace(/[^0-9-]/g, ""); 
        setCurrentInput(val);

        const currentQ = questions[currentIndex];
        if (!currentQ) return;
        
        const expectedAnswerString = currentQ.correctAnswer.toString();

        if (currentIndex >= 19 && val.length >= expectedAnswerString.length && parseInt(val) === currentQ.correctAnswer) {
            setQuestionsAnswered(prev => prev + 1);
            setGameOver(true);
            setCurrentInput("");
            return;
        }

        if (val.length >= expectedAnswerString.length) {
            if (parseInt(val) === currentQ.correctAnswer) {
                setQuestionsAnswered(prev => prev + 1);
                setCurrentIndex(prev => prev + 1);
                setCurrentInput("");
            } else {
                setCurrentInput("");

                setIsInputDisabled(true);
                setTimeout(() => {
                    setIsInputDisabled(false);
                    // Regain focus after the DOM has updated and the input is no longer disabled
                    setTimeout(() => {
                        if (inputRef.current) {
                            inputRef.current.focus();
                        }
                    }, 0);
                }, 400);
            }
        }
    };

    if (!gameStarted) {
        return (
            <div className="active-game-container flex flex-col items-center justify-center p-8 text-center h-screen">
                <h1 className="text-6xl font-bold mb-4">Starting in... {countdown}</h1>
            </div>
        );
    }


    if (gameOver) {
        let xp = 0;
        const baseXp = 15000 - Math.floor(timeTaken / 10); // 48000 ms -> 4800 -> 15000-4800 = 11200 xp
        const questionBonus = questionsAnswered * 25;
        xp += baseXp; 
        xp += questionBonus; 
        return (
            <div className="game-over-screen text-center">
                <h1 className="text-4xl font-bold mb-6">Game Over</h1>
                <p>your time: {(timeTaken / 1000).toFixed(2)}s</p>
                <p>base xp: {baseXp}</p>

                <p>question bonus: {questionBonus}</p>
                <p>total xp: {xp}</p>
                
                {xpData && user ? (
                    <XpBar user={user} xpData={xpData} />
                ) : (
                    <p className="text-sm">calculating xp...</p>
                )}

                <div className="mt-8 flex gap-4 justify-center">
                    <Link href="/" className="game-button font-bold">Return to Lobby</Link>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className="active-game-container flex flex-col items-center justify-center h-screen text-center">
            <div className="active-game-container">
                <div className="game-header">
                    <div className="score-board">
                        <p>{user?.username}</p>
                        <p>Question {currentIndex + 1} / 20</p>
                    </div>
                    <div className="other-info">
                        <p>Time: {(timeTaken / 1000).toFixed(2)}s</p>
                    </div>
                </div>
            </div>

            <div className="questions-container">
                <h1 className="cur-question">{currentQ?.question}</h1>
                <input 
                    ref={inputRef}
                    type="text"
                    value={currentInput}
                    onChange={handleInput}
                    autoFocus
                    disabled={isInputDisabled}
                    className="answer-input text-center text-black-500"
                    style={{ opacity: isInputDisabled ? 0.5 : 1,
                        backgroundColor: isInputDisabled ? "#f8d7da" : "white",
                    }}
                />
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSurvivalBatch, getCurrentUser, saveSurvivalScore, cleanUpQuestions } from "../../actions";
import { useQuery } from "@tanstack/react-query";

export default function ActiveSurvivalGame() {
    const { roomId } = useParams();
    const router = useRouter();
    
    const [questions, setQuestions] = useState<{ question: string, correctAnswer: number }[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentInput, setCurrentInput] = useState("");
    const [score, setScore] = useState(0); // The actual points score
    const [questionsAnswered, setQuestionsAnswered] = useState(0); // number of questions completed
    
    // Combo State
    const [combo, setCombo] = useState(0);
    const [comboLevel, setComboLevel] = useState(1);
    const [maxCombo, setMaxCombo] = useState(0);
    const [isInputDisabled, setIsInputDisabled] = useState(false);

    // Scoring Timing
    const questionStartTime = useRef<number>(Date.now());
    
    useEffect(() => {
        questionStartTime.current = Date.now();
    }, [currentIndex]);
    
    const [timeLeft, setTimeLeft] = useState(30.0); 
    const [gameOver, setGameOver] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const { data: user, isLoading: isUserLoading } = useQuery({
        queryKey: ["currentUser"],
        queryFn: getCurrentUser,
    });

    // fetch first 50 questions
    const { data: initialQuestions, isLoading: areQuestionsLoading } = useQuery({
        queryKey: ["survivalQuestions", roomId],
        queryFn: () => getSurvivalBatch(roomId as string, 50),
        enabled: !!roomId,
    });

    // Populate questions when they arrive
    useEffect(() => {
        if (initialQuestions) {
            setQuestions(initialQuestions as any);
        }
    }, [initialQuestions]);


    useEffect(() => {
        if (questions.length === 0 || gameOver || !user) return;

        let animationFrameId: number;
        let lastTime = performance.now();
        let totalTimeElapsedInSeconds = 0;

        const tick = (currentTime: number) => {
            const deltaTimeInSeconds = (currentTime - lastTime) / 1000;
            lastTime = currentTime;
            totalTimeElapsedInSeconds += deltaTimeInSeconds;

            // This is what makes it a "Survival" mode!
            // The speed of drain increases by 5% for every real-life second survived. 
            // e.g. after 20 seconds, it's draining at 2.0x normal speed.
            const drainMultiplier = 1 + (totalTimeElapsedInSeconds * 0.05);

            setTimeLeft((prevTime) => {
                const newTime = prevTime - (deltaTimeInSeconds * drainMultiplier);
                
                // End game condition
                if (newTime <= 0) {
                    setGameOver(true);
                    return 0;
                }
                return newTime;
            });

            animationFrameId = requestAnimationFrame(tick);
        };

        animationFrameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animationFrameId);
    }, [questions.length, gameOver, user]);

    useEffect(() => {
        if (gameOver) {
            saveSurvivalScore(score, questionsAnswered, maxCombo, roomId as string).then(res => {
                if (res.success) {
                    console.log("Survival score saved!", res);
                }
            });
            cleanUpQuestions(roomId as string, currentIndex);
        }
    }, [gameOver, score, questionsAnswered, maxCombo, roomId, currentIndex]);

    useEffect(() => {
        async function fetchMoreQuestions() {
            // Uninterrupted gameplay: If we are close to running out (10 left), fetch 50 more!
            if (questions.length > 0 && currentIndex >= questions.length - 10 && !isFetchingMore) {
                setIsFetchingMore(true);
                const moreQs = await getSurvivalBatch(roomId as string, 50);
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
        if (gameOver || isInputDisabled) return;
        
        // Match the number-only filter exactly from ActiveGame.tsx
        const val = e.target.value.replace(/[^0-9-]/g, ""); 
        setCurrentInput(val);

        const currentQ = questions[currentIndex];
        if (!currentQ) return;
        
        const expectedAnswerString = currentQ.correctAnswer.toString();

        if (val.length >= expectedAnswerString.length) {
            if (parseInt(val) === currentQ.correctAnswer) {
                const elapsedMs = Date.now() - questionStartTime.current;
                
                let baseScore = 1000;
                if (elapsedMs > 500) {
                    baseScore -= Math.floor((elapsedMs - 500) * 0.05);
                }
                baseScore = Math.max(50, baseScore);

                const newCombo = combo + 1;
                const newComboLevel = (newCombo % 3 === 0) ? comboLevel + 0.5 : comboLevel;
                const newScore = score + Math.round((baseScore * newComboLevel));

                setCombo(newCombo);
                setComboLevel(newComboLevel);
                setMaxCombo(prev => Math.max(prev, newCombo));
                setScore(newScore);
                setQuestionsAnswered(prev => prev + 1);
                
                setTimeLeft(prev => prev + 1.0); 
                setCurrentIndex(prev => prev + 1);
                setCurrentInput("");
            } else {
                setCurrentInput("");
                setCombo(0);
                setComboLevel(1);

                // Instantly penalize 
                setTimeLeft(prev => prev - 3.0); 

                setIsInputDisabled(true);
                setTimeout(() => {
                    setIsInputDisabled(false);
                }, 400);
            }
        }
    };

    if (gameOver) {
        return (
            <div className="game-over-screen text-center">
                <h1 className="text-4xl font-bold mb-6">Game Over</h1>
                <p>your score: {score}</p>
                <p>you answered {questionsAnswered} questions</p>
                <p>max combo: {maxCombo}</p>
                <div className="mt-8 flex gap-4 justify-center">
                    <button 
                        onClick={() => router.push("/play")}
                        className="game-button font-bold"
                    >
                        Back to Menu
                    </button>
                    <button 
                        onClick={() => window.location.reload()}
                        className="game-button font-bold"
                    >
                        Play Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="active-game-container flex flex-col items-center justify-center p-8 text-center h-screen">
            <div className="active-game-container">
                <div className="game-header">
                    <div className="score-board">
                        <p>Score: {score}</p>
                    </div>
                    <div className="other-info">
                        <div className="w-full bg-gray-200 h-3 mt-1 mb-2 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-3 rounded-full" style={{ width: `${Math.min(100, Math.max(0, (timeLeft / 30) * 100))}%` }}></div>
                        </div>
                        <p>Combo: {combo} (x{comboLevel.toFixed(1)})</p>
                    </div>
                </div>
            </div>

            <div className="questions-container">
                <h1 className="cur-question">{questions[currentIndex]?.question}</h1>
                <input 
                    type="text"
                    value={currentInput}
                    onChange={handleInput}
                    autoFocus
                    className="answer-input text-center"
                    style={{ opacity: isInputDisabled ? 0.5 : 1,
                        backgroundColor: isInputDisabled ? "#f8d7da" : "white",
                    }}
                />
            </div>
        </div>
    );
}
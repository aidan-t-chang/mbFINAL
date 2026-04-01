"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUser, getGameQuestions } from "../../actions";
import toast from "react-hot-toast";

export default function ActiveGame() {
    const { roomId } = useParams();
    const router = useRouter();

    const [user, setUser] = useState<any>(null);
    const [socket, setSocket] = useState<WebSocket | null>(null);
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

            const gameQuestions = await getGameQuestions(roomId as string);
            setQuestions(gameQuestions);

            const ws = new WebSocket("ws://localhost:8080");
            ws.onopen = () => {
                // join room again -> new url -- old connection got severed
                ws.send(JSON.stringify({
                    type: "JOIN_ROOM",
                    roomId: roomId,
                    user: { id: currentUser.id, username: currentUser.username}
                }));

                ws.send(JSON.stringify({ type: "GAME_LOADING" }))
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === "GAME_ACTION" && data.user.id !== currentUser.id) {
                    if (data.action === "CORRECT_ANSWER") {
                        setOpponentScore((prev) => prev + 1);
                    }
                }
            };

            setSocket(ws);
            return () => ws.close();
        }
        setUpGame();
    }, [roomId, router]);

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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCurrentInput(val);

        const currentQuestion = questions[currentIndex];

        // check if current input is correct
        if (currentQuestion && parseInt(val) === currentQuestion.answer) {
            setCurrentInput("");
            setCurrentIndex((prev) => prev + 1);
            // implement combo scoring later
            setMyScore(prev => prev + 1);

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: "GAME_ACTION",
                    action: "CORRECT_ANSWER",
                    user: { id: user.id, username: user.username }
                }));
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
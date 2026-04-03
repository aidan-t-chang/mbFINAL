"use client";

import { useEffect, useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUser } from "../../actions";
import "./CustomLobby";
import toast from "react-hot-toast";
import "./game.css";
import CustomLobby from "./CustomLobby";
import ActiveGame from "./ActiveGame";

export default function Game() {
    const { roomId } = useParams();
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [user, setUser] = useState<any>(null);
    const [answer, setAnswer] = useState<string | null>(null);
    const [players, setPlayers] = useState<{ id: string, username: string}[]>([]);
    const [isReady, setIsReady] = useState(false);
    const router = useRouter();
    const [gameStarted, setGameStarted] = useState(false);

    const isOwner = players.length > 0 && players[0].id === user?.id;

    const handleAnswer = (answer: string) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ 
                type: "GAME_ACTION",
                answer: answer,
                user: { id: user.id, username: user.username }
            }));
        }
    }

    const handleStartGame = () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: "GAME_ACTION",
                action: "START_GAME"
            }));

            // start loading questions now
            socket.send(JSON.stringify({ type: "GAME_LOADING" }));
            setGameStarted(true);
        }
    }


    useEffect(() => {
        if (!user) return;

        const ws = new WebSocket("ws://localhost:8081");

        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: "JOIN_ROOM",
                roomId: roomId,
                user: { id: user.id, username: user.username }
            }));
        };

        ws.onmessage = (event) => {
            // game state updates here
            const data = JSON.parse(event.data);
            if (data.type === "PLAYER_JOIN") {
                setPlayers(data.players);
                toast.success(`someone has joined the game`);
            } else if (data.type === "GAME_READY") {
                toast.success("Game is ready!");
                setIsReady(true);
            } else if (data.type === "GAME_ACTION") {
                console.log("Game action received: ", data.action);
                if (data.action === "START_GAME") {
                    setGameStarted(true);
                }
            }
        };

        setSocket(ws);
        return () => {
            ws.close();
        }
    }, [roomId, user]);

    useEffect(() => {
        async function fetchUser() {
            const currentUser = await getCurrentUser();

            if (!currentUser) {
                toast.error("You must be logged in to join a game");
                router.push("/login");
            } else {
                setUser(currentUser);
            }
        }
        fetchUser();
    }, [router]);

    if (!user) {
        return <p>loading</p>; // implement loading later
    }

    if (gameStarted) {
        return <ActiveGame socket={socket} />
    }

    return (
        <>
            <div>gameroom {roomId}</div>
            <div>
                <h2>players:</h2>
                <ul>
                    {players.map((p, index) => (
                        <li key={index}>
                            {p.username} {p.id === user.id ? "(you)" : ""}
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <button 
                className="game-button" 
                disabled={!isReady || !isOwner} 
                onClick={handleStartGame}>
                    {isOwner ? "Start Game" : "Waiting for host..."}
                    </button>
            </div>
        </>
    )
}

"use client";

import { useEffect, useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUser } from "../../actions";
import toast from "react-hot-toast";
import "./game.css";

export default function Game() {
    const { roomId } = useParams();
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [user, setUser] = useState<any>(null);
    const [answer, setAnswer] = useState<string | null>(null);
    const [players, setPlayers] = useState<{ id: string, username: string}[]>([]);
    const [isReady, setIsReady] = useState(false);
    const router = useRouter();

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
        console.log("strating game n stuff");
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
            const data = JSON.parse(event.data);
            if (data.type === "PLAYER_JOIN") {
                setPlayers(data.players);
                toast.success(`someone has joined the game`);
            } else if (data.type === "GAME_READY") {
                toast.success("Game is ready!");
                setIsReady(true);
            } else if (data.type === "GAME_ACTION") {
                console.log("Game action received: ", data.action);
            }
            // game state updates here
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
        return null; // implement loading later
    }

    return (
        <>
            <div>
                <h2>question:</h2>
                <p>this the question fr</p>
                <input type="text" placeholder="answer" onChange={(e) => setAnswer(e.target.value)} />
                // clear input after submit and then disable
            </div>
        </>
    )
    // set it later so that pressing enter submits the answer and add a submit button for mobile users maybe
    // eventually separate ui into game lobby vs game in progress
        

}

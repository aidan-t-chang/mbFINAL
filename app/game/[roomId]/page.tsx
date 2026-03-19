"use client";

import { useEffect, useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUser } from "../../actions";
import toast from "react-hot-toast";
import Link from "next/link";
import "./game.css";
import { get } from "http";

export default function Game() {
    const { roomId } = useParams();
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [user, setUser] = useState<any>(null);
    // placeholder answers
    const [answers, setAnswers] = useState<string[]>(["answer1", "answer2", "answer3", "answer4"]);
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
            if (data.type === "START_GAME") {
                toast.success("Game is ready!");
                console.log("Game is ready");
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
            <div>gameroom {roomId}</div>
            {answers.map((answer, index) => (
                <button key={index} onClick={() => handleAnswer(`${answer}`)}>
                    {answer}
                </button>
            ))}
        </>
    )
        

}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../actions";

export default function FindMatchPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        async function fetchuser() {
            const u = await getCurrentUser();
            if (!u) {
                router.push("/login");
                return;
            }
            setUser(u);
        }
        fetchuser();
    }, [router]);

    useEffect(() => {
        if (!isSearching) {
            setElapsedTime(0);
            return;
        }
        const timer = setInterval(() => setElapsedTime(p => p + 1), 1000);
        return () => clearInterval(timer);
    }, [isSearching]);

    const handleFindMatch = () => {
        if (!user) return;

        setIsSearching(true);
        const ws = new WebSocket("ws://localhost:8081");

        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: "FIND_MATCH",
                user: { id: user.id, username: user.username },
                mbrr: user.mbrr
            }));``
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "MATCH_FOUND") {
                ws.close();
                router.push(`/game/${data.roomId}`);
            }
        };

        ws.onclose = () => {
            setIsSearching(false);
        };
        setSocket(ws);
    };

    const handleCancel = () => {
        if (socket) {
            socket.send(JSON.stringify({
                type: "CANCEL_MATCH",
                user: { id: user.id }
            }));
            socket.close();
        }
        setIsSearching(false);
    };

    if (!user) return <p>Loading...</p>;

    return (
        <div className="find-match-page">
            <h1>Competitive</h1>
            <div>
                <p>{user.username}</p>
                <p>{user.rank} ({user.mbrr})</p>
            </div>

            { isSearching ? (
                <div>
                    <p>searching...</p>
                    <p>time elapsed: {elapsedTime} seconds</p>
                    <button onClick={handleCancel}>Cancel</button>
                </div>
            ) : (
                <button onClick={handleFindMatch}>Find Match</button>
            )}

        </div>
    );
}
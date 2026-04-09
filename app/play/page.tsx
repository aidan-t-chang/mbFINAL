"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../actions";
import Link from "next/link";

const generateRoomId = () => Math.random().toString(36).substring(2, 8);
export default function FindMatchPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [joinRoomId, setJoinRoomId] = useState("");
    const [roomId, setRoomId] = useState("");

    const handleJoinRoom = () => {
        if (joinRoomId.trim()) {
        router.push(`/game/${joinRoomId.trim()}`); 
        }
    };

    useEffect(() => {
        async function fetchUser() {
            const u = await getCurrentUser();
            if (!u) {
                router.push("/login");
                return;
            }
            setUser(u);
        }
        fetchUser();
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
            <h1>competitive</h1>
            <div>
                <p>{user.username}</p>
                <p>{user.rank} ({user.mbrr})</p>
            </div>
            {/* add other gamemodes later */}
            <div>
                <h1>custom game</h1>
                <div>
                    <Link href={`/game/${roomId}`}>create new game</Link>
                </div>
                <div>
                    <input 
                    type="text"
                    placeholder="room id"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                    />
                    <button onClick={handleJoinRoom} disabled={!joinRoomId}>join game</button>
                </div>
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
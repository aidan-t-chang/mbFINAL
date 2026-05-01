"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../actions";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const generateRoomId = () => Math.random().toString(36).substring(2, 8);
export default function FindMatchPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data: user, isLoading } = useQuery({
        queryKey: ["currentUser"],
        queryFn: async () => {
            const loggedInUser = await getCurrentUser();
            return loggedInUser || null;
        },
    });

    const [isSearching, setIsSearching] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [joinRoomId, setJoinRoomId] = useState("");
    const [roomId, setRoomId] = useState(generateRoomId());

    const { data: queueSize = 0 } = useQuery({
        queryKey: ["queueSize"],
        queryFn: async () => {
            try {
                const res = await fetch("http://localhost:8081/api/queue-size");
                if (!res.ok) {
                    return 0;
                }
                const data = await res.json();
                return data.size || 0;
            } catch (e) {
                console.log("Failed to fetch queue size:", e);
                return 0;
            }
        },
        refetchInterval: 5000,
    })

    const handleJoinRoom = () => {
        if (joinRoomId.trim()) {
        router.push(`/game/${joinRoomId.trim()}`); 
        }
    };

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
        const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8081";
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: "FIND_MATCH",
                user: { id: user.id, username: user.username },
                mbrr: user.mbrr
            }));
            
            queryClient.invalidateQueries({ queryKey: ["queueSize"] });
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "MATCH_FOUND") {
                ws.close();
                router.push(`/game/${data.roomId}?matchmaking=true`);
            }
        };

        ws.onclose = () => {
            setIsSearching(false);
        };
        setSocket(ws);
    };

    const handleCancel = () => {
        if (!user) {
            return;
        }
        if (socket) {
            socket.send(JSON.stringify({
                type: "CANCEL_MATCH",
                user: { id: user.id }
            }));
            socket.close();
        }
        queryClient.invalidateQueries({ queryKey: ["queueSize"] });
        setIsSearching(false);
    };

    if (isLoading) {
        return <p className="text-center flex flex-col items-center justify-center h-screen">Loading...</p>;
    }

    if (!user) {
        router.push("/login");
        return null;
    }

    return (
        <div className="find-match-page flex flex-col items-center justify-center h-screen text-center">
            <h1 className="font-bold">competitive</h1>
            <div>
                <p>{user.username}</p>
                <p>{user.rank} ({user.mbrr} mbrr)</p>
            </div>
            { isSearching ? (
                <div>
                    <p>searching...</p>
                    <p>time elapsed: {elapsedTime} seconds</p>
                    <p>{queueSize} players in queue</p>
                    <button onClick={handleCancel}>Cancel</button>
                </div>
            ) : (
                <button onClick={handleFindMatch}>Find Match</button>
            )}
            {/* add other gamemodes later */}
            <div>
                <h1 className="font-bold">custom game</h1>
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
            <Link href="/">Back</Link>
        </div>
    );
}
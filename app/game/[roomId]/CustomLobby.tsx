"use client";

import { useEffect, useState } from "react";

interface CustomLobbyProps {
    roomId: string | string[];
    players: { id: string; username: string }[];
    currentUserId: string;
    isReady: boolean;
    onStartGame: () => void;
}
export default function CustomLobby({
    roomId,
    players,
    currentUserId,
    isReady,
    onStartGame
}: CustomLobbyProps) {
    return (
        <div className="custom-lobby flex flex-col items-center justify-center h-screen text-center">
            <div>gameroom {roomId}</div>
            <div>
                <h2>players:</h2>
                <ul>
                    {players.map((p, index) => (
                        <li key={index}>
                            {p.username} {p.id === currentUserId ? "(you)" : ""}
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <button className="game-button" disabled={!isReady} onClick={onStartGame}>Start Game</button>
            </div>
        </div>
    )
}
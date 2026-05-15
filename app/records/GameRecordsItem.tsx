"use client";

import { useState } from "react";

type GameRecordsItemProps = {
  record: any; 
  username: string;
};

export default function GameRecordsItem({ record, username }: GameRecordsItemProps) {
    const [showQuestions, setShowQuestions] = useState(false);
    
    const { game, score, isWinner, joinedAt } = record;
    const opponents = game.players.filter((p: any) => p.user.username !== username);

    const isSoloMode = game.type === "race" || game.type === "survival";
    const bgClass = (isSoloMode || isWinner) ? "bg-green-900/40 border-green-500" : "bg-red-900/40 border-red-500";
    
    return (
        <div className={`flex flex-col border-2 rounded-lg p-4 ${bgClass}`}>
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">
                        {isSoloMode 
                            ? (game.type ? game.type.toUpperCase() : "SOLO GAME")
                            : `${isWinner ? "Victory" : "Defeat"} - ${game.type ? game.type.toUpperCase() : "GAME"}`
                        }
                    </h2>
                    <p className="text-sm opacity-80">
                        {new Date(joinedAt).toLocaleDateString()} at {new Date(joinedAt).toLocaleTimeString()}
                    </p>
                    <p className="mt-2">Score: <span className="font-bold">{score}</span></p>
                </div>
                
                {!isSoloMode && (
                    <div className="text-right">
                        <p className="font-semibold">Opponents:</p>
                        {opponents.length > 0 ? (
                            <ul className="text-sm">
                                {opponents.map((p: any) => (
                                    <li key={p.id}>{p.user.username} (Score: {p.score})</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-400">None (Solo)</p>
                        )}
                    </div>
                )}
            </div>

            <button 
                className="mt-4 bg-gray-800 hover:bg-gray-700 py-1 px-4 rounded transition self-start text-sm"
                onClick={() => setShowQuestions(!showQuestions)}
            >
                {showQuestions ? "Hide Questions" : "View Questions"}
            </button>

            {showQuestions && (
                <div className="mt-4 bg-black/30 p-4 rounded max-h-60 overflow-y-auto">
                    {game.questions.length > 0 ? (
                        <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {game.questions.map((q: any) => (
                                <li key={q.id} className="bg-black/50 p-2 rounded text-center">
                                    <span className="block font-mono text-sm">{q.question} = ?</span>
                                    <span className="text-green-400 font-bold block mt-1">{q.correctAnswer}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-400">No questions recorded for this game.</p>
                    )}
                </div>
            )}
        </div>
    );
}
import Link from "next/link";

interface LeaderboardUser {
    id: string;
    username: string;
    rank: string;
    mbrr: number;
    totalExp: number;
    bestSurvivalScore?: number;
}

interface LeaderboardItemProps {
    user: LeaderboardUser;
    place: number;
}

export default function LeaderboardItem({ user, place, version }: LeaderboardItemProps & { version: "mbrr" | "totalExp" | "bestSurvivalScore" }) {
    return (
        <div className="leaderboard-container flex justify-between w-96 p-2 border-b">
            <div>
                <span className="leaderboard-place font-bold mr-4">#{place}</span>

                <Link href={`/profile/${user.username}`} className="leaderboard-username text-blue-500 hover:underline">
                    {user.username}
                </Link>
            </div>

            <div>
                <span className="leaderboard-rank text-gray-500">
                    {version === "mbrr" ? user.mbrr.toLocaleString() + " MBRR" : 
                     version === "totalExp" ? user.totalExp.toLocaleString() + " XP" :
                     (user.bestSurvivalScore || 0).toLocaleString()}
                </span>
            </div>
        </div>
    )
}
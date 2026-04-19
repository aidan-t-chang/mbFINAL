import Link from "next/link";

interface LeaderboardUser {
    id: string;
    username: string;
    rank: string;
    mbrr: number;
}

interface LeaderboardItemProps {
    user: LeaderboardUser;
    place: number;
}

export default function LeaderboardItem({ user, place }: LeaderboardItemProps) {
    return (
        <div className="leaderboard-container">
            <div>
                <span className="leaderboard-place">{place}</span>

                <Link href={`/profile/${user.username}`} className="leaderboard-username">
                    {user.username}
                </Link>
            </div>

            <div>
                <span className="leaderboard-rank">{user.rank} ({user.mbrr.toFixed(2)})</span>
            </div>
        </div>
    )
}
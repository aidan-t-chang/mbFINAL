import GameRecordsItem from "../GameRecordsItem";
import Link from "next/link";
import { getUserByUsername, getUserHistory } from "../../actions";

export default async function Records({ 
    params,
    searchParams
}: { 
    params: Promise<{ username: string }>,
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { username } = await params;
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const pageStr = resolvedSearchParams.page;
    const currentPage = typeof pageStr === "string" ? parseInt(pageStr, 10) : 1;
    const skip = (currentPage - 1) * 20;

    const user = await getUserByUsername(username);

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-3xl text-red-500 mb-4">User not found</h1>
                <Link href="/" className="text-blue-500 hover:text-blue-400">Return Home</Link>
            </div>
        );
    }

    const historyResult = await getUserHistory(username, skip, 20);
    const history = historyResult.success && historyResult.history ? historyResult.history : [];
    const totalCount = historyResult.success && historyResult.totalCount ? historyResult.totalCount : 0;
    const totalPages = Math.ceil(totalCount / 20) || 1;

    return (
        <div className="history-container flex flex-col items-center w-full p-4 max-w-4xl mx-auto text-white">
            <h1 className="text-3xl font-bold mb-6">{username}'s Match History</h1>
            
            {history.length === 0 ? (
                <p className="text-gray-400">No games played yet.</p>
            ) : (
                <div className="w-full flex flex-col gap-4">
                    {history.map((record) => (
                        <GameRecordsItem 
                            key={`${record.gameId}-${record.id}`} 
                            record={record} 
                            username={username}
                        />
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex gap-4 mt-8 items-center">
                    <Link 
                        href={`/records/${username}?page=${currentPage - 1}`}
                        className={`px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 ${currentPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
                    >
                        Previous
                    </Link>
                    <span className="text-gray-300">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Link 
                        href={`/records/${username}?page=${currentPage + 1}`}
                        className={`px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 ${currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
                    >
                        Next
                    </Link>
                </div>
            )}
            
            <Link href={`/`} className="mt-8 text-blue-500 hover:text-blue-400">
                Back
            </Link>
        </div>
    );
}
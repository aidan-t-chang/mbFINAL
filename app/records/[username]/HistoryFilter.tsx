"use client";

import { useRouter } from "next/navigation";

export default function HistoryFilter({ currentType, username }: { currentType: string, username: string }) {
    const router = useRouter();

    return (
        <div className="flex items-center gap-2">
            <label htmlFor="type" className="text-sm font-semibold">Filter by Type:</label>
            <select 
                id="type" 
                value={currentType}
                className="bg-gray-800 text-white rounded px-2 py-1 outline-none text-sm"
                onChange={(e) => {
                    // This does a soft navigation instead of a full page refresh
                    router.push(`/records/${username}?type=${e.target.value}`);
                }}
            >
                <option value="all">All</option>
                <option value="standard">Standard</option>
                <option value="race">Race</option>
                <option value="survival">Survival</option>
            </select>
        </div>
    );
}
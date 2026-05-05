import { calculateLevel } from "../../utils";
import { useEffect, useState } from "react";

export default function XpBar({ user, xpData }: { user: any, xpData: { expGained: number, oldTotalExp: number, newTotalExp: number } | null }) {
    const [currentExp, setCurrentExp] = useState(xpData ? xpData.oldTotalExp : user.totalExp || 0);
    const [isLevelingUp, setIsLevelingUp] = useState(false);

    useEffect(() => {
        if (currentExp >= xpData?.newTotalExp!) {
            return;
        }

        const animationStep = Math.max(1, Math.floor(xpData?.expGained! / 30)); // number of steps
        let animationFrame: number;

        const animate = () => {
            setCurrentExp((prevExp: number) => {
                const nextExp = Math.min(prevExp + animationStep, xpData?.newTotalExp!);
                
                const prev = calculateLevel(prevExp);
                const next = calculateLevel(nextExp);

                if (next.level > prev.level) {
                    setIsLevelingUp(true);
                    setTimeout(() => setIsLevelingUp(false), 2000); // show level up for 2 seconds
                }
                return nextExp;
            });

            if (currentExp < xpData?.newTotalExp! && !isLevelingUp) {
                animationFrame = requestAnimationFrame(animate);
            }
        };
        
        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [currentExp, xpData, isLevelingUp]);

    const level = calculateLevel(currentExp);
    const fillPct = (level.curLevelExp / level.nextLevelExp) * 100;

    return (
        <div className="w-full max-w-md mx-auto my-6 big-gray-100 p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-end mb-2">
                <h2 className="text-lg">level {level.level}</h2>
                <span className="text-sm">+{xpData?.expGained}</span>
            </div>

            <div className="w-full h-4 bg-gray-300 rounded-full overflow-hidden relative">
                <div className="bg-blue-500 h-full transition-all duration-75" style={{ width: `${fillPct}%` }}>
                </div>
            </div>

            <p>
                {Math.floor(level.curLevelExp)} / {level.nextLevelExp} XP
            </p>
        </div>
    )
}

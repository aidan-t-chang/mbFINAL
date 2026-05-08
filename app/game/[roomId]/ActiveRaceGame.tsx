"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUser, cleanUpQuestions } from "../../actions";
import { useQuery } from "@tanstack/react-query";
import { generateEzAddition } from "../../actions";
import { saveRaceScore } from "../../actions";

// the race gamemode: answer 20 easy addition problems as fast as you can

export default function ActiveRaceGame() {
    const { roomId } = useParams();
    const router = useRouter();
    
    const [questions, setQuestions] = useState<{ question: string, correctAnswer: number }[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentInput, setCurrentInput] = useState("");
    const [questionsAnswered, setQuestionsAnswered] = useState(0); // number of questions completed
    const [isInputDisabled, setIsInputDisabled] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [timeTaken, setTimeTaken] = useState(0);

    const { data: user, isLoading: isUserLoading } = useQuery({
        queryKey: ["currentUser"],
        queryFn: getCurrentUser,
    });

    // fetch first 50 questions
    const { data: initialQuestions, isLoading: areQuestionsLoading } = useQuery({
        queryKey: ["raceQuestions", roomId],
        queryFn: () => generateEzAddition(roomId as string, 50),
        enabled: !!roomId,
    });

    // Populate questions when they arrive
    useEffect(() => {
        if (initialQuestions) {
            setQuestions(initialQuestions as any);
        }
    }, [initialQuestions]);


}
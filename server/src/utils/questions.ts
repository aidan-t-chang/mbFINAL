import { prisma } from "../db/index.js";

export async function generateAddition(roomId: string, numQuestions: number) {
    const newQuestions = [];
    const uniqueQuestions = new Set<string>();

    while (newQuestions.length < numQuestions) {
        const num1 = Math.floor(Math.random() * 40) + 1; // 1-40
        const num2 = Math.floor(Math.random() * 40) + 1; // 1-40

        const questionText = `${num1} + ${num2}`;
        const answer = (num1 + num2);

        if (!uniqueQuestions.has(questionText)) {
            uniqueQuestions.add(questionText);
            newQuestions.push({
                gameId: roomId,
                question: questionText,
                correctAnswer: answer
            });
        }
    }

    try {
        await prisma.question.createMany({
            data: newQuestions
        });
        console.log(`Created ${numQuestions} questions for game ${roomId}`);
        return newQuestions;
    } catch (e) {
        console.error("Error creating questions:", e);
        return null;
    }
}

export async function generateSubtraction(roomId: string, numQuestions: number) {
    const newQuestions = [];
    const uniqueQuestions = new Set<string>();

    while (newQuestions.length < numQuestions) {
        const num1 = Math.floor(Math.random() * 20) + 1; // 1-20
        const num2 = Math.floor(Math.random() * 20) + 1; // 1-20

        const questionText = `${num1} - ${num2}`;
        const answer = (num1 - num2);

        if (!uniqueQuestions.has(questionText)) {
            uniqueQuestions.add(questionText);
            newQuestions.push({
                gameId: roomId,
                question: questionText,
                correctAnswer: answer
            });
        }
    }

    try {
        await prisma.question.createMany({
            data: newQuestions
        });
        console.log(`Created ${numQuestions} questions for game ${roomId}`);
        return newQuestions;
    } catch (e) {
        console.error("Error creating questions:", e);
        return null;
    }
}

// Generate both addition and subtraction questions for a game
export async function generateBoth(roomId: string, numQuestions: number) {
    const allQuestions = [];
    let counter: number = 0;
    while (counter < numQuestions) {
        if (Math.random() < 0.5) { // addition
            const questions = await generateAddition(roomId, 1);
            if (questions) allQuestions.push(...questions);
        } else {
            const questions = await generateSubtraction(roomId, 1);
            if (questions) allQuestions.push(...questions);
        }
        counter++;
    }
    return allQuestions;
}

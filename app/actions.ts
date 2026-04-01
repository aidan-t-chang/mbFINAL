"use server";

import { prisma } from "../server/src/db/index";
import crypto from "crypto";
import { cookies } from "next/headers";

async function createAccount(formData: FormData) {
    const email = formData.get("email") as string;
    const username = formData.get("username") as string;
    let rawPass = formData.get("password") as string;

    if (!email || !username || !rawPass) {
        return { success: false, error: "Missing fields" };
    }

    try {
        const salt = crypto.randomBytes(16).toString("hex");

        const pepper = process.env.pepper || "";
        rawPass += pepper;

        const hashedPass = crypto
        .scryptSync(rawPass, salt, 64)
        .toString("hex");

        const newUser = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPass,
                salt: salt,
            },
        });
        return { success: true, user: { id: newUser.id, email: newUser.email, username: newUser.username } };
    } catch (error: any) {
        if (error.code === "P2002") {
            return { success: false, error: "Email or username already exists" };
        }
        return { success: false, error: error};
    }

}

async function login(formData: FormData) {
    const fEmail = formData.get("email") as string;
    let rawPass = formData.get("password") as string;

    if (!fEmail || !rawPass) {
        return { success: false, error: "Missing fields" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: fEmail },
        });
        if (!user) {
            return { success: false, error: "Invalid email or password" };
        }

        const pepper = process.env.pepper || "";
        rawPass += pepper;

        const hashedPass = crypto
            .scryptSync(rawPass, user.salt, 64)
            .toString("hex");

        if (hashedPass !== user.password) {
            return { success: false, error: "Invalid email or password" };
        }

        const cookieStore = await cookies();
        cookieStore.set("sessionId", user.id.toString(), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 24 * 30, // 1 month
        });

        return { success: true, user: { id: user.id, email: user.email, username: user.username } };
    } catch (error: any) {
        return { success: false, error: error };
    }
}

async function getCurrentUser() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionId")?.value;
    console.log("Session ID from cookie:", sessionId);

    if (!sessionId) {
        return null;
    }

    const parsedId = Number(sessionId);
    if (isNaN(parsedId)) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: parsedId },
        select: { id: true, email: true, username: true }
    });

    return user;
}

async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete("sessionId");
}

async function getGameQuestions(roomId: string) {
    return await prisma.question.findMany({
        where: { gameId: roomId },
        orderBy: { id: "asc" }
    });
}

async function cleanUpQuestions(roomId: string, questionIndex: number) {
    const allQuestions = await getGameQuestions(roomId);

    const unusedQuestions = allQuestions.slice(questionIndex);
    const unusedQuestionIds = unusedQuestions.map(q => q.id);

    if (unusedQuestionIds.length > 0) {
        try {
            await prisma.question.deleteMany({
                where: { id: { in: unusedQuestionIds } }
            });
            console.log(`Cleaned up ${unusedQuestionIds.length} questions for game ${roomId}`);
        } catch (e) {
            console.error("Error cleaning up questions:", e);
        }
    }
}

export { createAccount, login, getCurrentUser, logout, getGameQuestions, cleanUpQuestions};
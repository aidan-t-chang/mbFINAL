"use server";

import { prisma } from "../server/src/db/index";
import crypto from "crypto";

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

        return { success: true, user: { id: user.id, email: user.email, username: user.username } };
    } catch (error: any) {
        return { success: false, error: error };
    }
}

export { createAccount, login};
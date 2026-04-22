"use client";

import { useState, useEffect } from "react";
import { createAccount, login, logout } from "../actions";
import { getCurrentUser } from "../actions";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from 'react-hot-toast';
import "./login.css";

export default function LoginPage() {
    const { data: user, isLoading } = useQuery({
        queryKey: ["currentUser"],
        queryFn: async () => {
            const loggedInUser = await getCurrentUser();
            return loggedInUser || null;
        }
    });

    const [userLogin, setuserLogin] = useState(true);
    const router = useRouter();

    const handleSubmit = async (formData: FormData) => {
        if (userLogin) {
            const result = await login(formData);

            if (result.success) {
                toast.success("Logged in successfully!");
                router.push("/");
            } else {
                toast.error("Error logging in: " + result.error);
                console.log(result.error);
            }
        } else {
            const result = await createAccount(formData);

            if (result.success) {
                toast.success("Account created successfully!");
            } else {
                toast.error("Error creating account: " + result.error);
                console.log(result.error);
            }
        }
    };

    return (
        <div className="login-container">
            <h1>{userLogin ? "login" : "create account"}</h1>
            <form action={handleSubmit}>
                <input type="email" name="email" placeholder="Email" required />
                {!userLogin && (
                    <input type="text" name="username" placeholder="Username" required />
                )}

                <input type="password" name="password" placeholder="Password" required />
                <button type="submit">{userLogin ? "log in" : "create that account"}</button>
            </form>
            <div>
                <button
                    type="button"
                    onClick={() => setuserLogin(!userLogin)}
                >
                    {userLogin ? "create an account" : "already have an account?"}
                </button>
            </div>
        </div>
    );
}
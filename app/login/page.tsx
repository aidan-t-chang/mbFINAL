"use client";

import { useState, useEffect } from "react";
import { createAccount, login, logout } from "../actions";
import { getCurrentUser } from "../actions";
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';
import "./login.css";

export default function LoginPage() {
    const [userLogin, setuserLogin] = useState(true);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        async function fetchUser() {
            const loggedInUser = await getCurrentUser();
            setUser(loggedInUser);
            if (loggedInUser) {
                router.push("/");
            }
        }
        fetchUser();
    }, [router]);


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
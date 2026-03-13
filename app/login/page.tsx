"use client";

import { createAccount } from "../actions";
import "./login.css";

export default function LoginPage() {
    const handleSubmit = async (formData: FormData) => {
        const result = await createAccount(formData);

        if (result.success) {
            alert("Account created successfully!");
        } else {
            alert("Error creating account: " + result.error);
            console.log(result.error);
        }
    };

    return (
        <div className="login-container">
            <h1>create account</h1>
            <form action={handleSubmit}>
                <input type="email" name="email" placeholder="Email" required />
                <input type="text" name="username" placeholder="Username" required />
                <input type="password" name="password" placeholder="Password" required />
                <button type="submit">submit</button>
            </form>
        </div>
    );
}
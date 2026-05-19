"use client";

import { useEffect, useState } from "react";
import { APP_VERSION } from "./utils";
import Markdown from "react-markdown";
import Link from "next/link";

export default function PatchNotesModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [markdown, setMarkdown] = useState("");

    useEffect(() => {
        const hasSeenPatchNotes = localStorage.getItem(`hasSeen${APP_VERSION}`);

        if (!hasSeenPatchNotes) {
            setIsOpen(true);
            localStorage.setItem(`hasSeen${APP_VERSION}`, "true");
        }

        fetch(`/md_patch_notes/${APP_VERSION}.md`)
            .then((response) => response.text())
            .then((text) => setMarkdown(text));
    }, []);

    const handleClose = () => {
        localStorage.setItem(`hasSeen${APP_VERSION}`, "true");
        setIsOpen(false);
    };

    return (
        <>
            {/* Version Text in Bottom Right */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 text-sm text-gray-500 hover:text-white z-40 transition-colors"
                aria-label="Open Patch Notes"
            >
                Pre-Alpha {APP_VERSION}
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="relative bg-zinc-900 border border-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none"
                            aria-label="Close"
                        >
                            &times;
                        </button>
                        <div className="mb-6">
                            <Markdown
                                components={{
                                    h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-6 mb-4 text-white" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-2xl font-semibold mt-5 mb-3 text-white" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-xl font-medium mt-4 mb-2 text-white" {...props} />,
                                    p: ({node, ...props}) => <p className="mb-4 text-gray-300 leading-relaxed" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 text-gray-300 space-y-1" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 text-gray-300 space-y-1" {...props} />,
                                    li: ({node, ...props}) => <li className="ml-4" {...props} />,
                                    a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-600 pl-4 py-1 mb-4 italic text-gray-400" {...props} />,
                                    code: ({node, ...props}) => <code className="bg-zinc-800 text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />,
                                }}
                            >
                                {markdown}
                            </Markdown>
                        </div>
                        <Link href={"/patch_notes"} className="text-blue-400 hover:underline">View Past Patch Notes</Link>
                    </div>
                </div>
            )}
        </>
    );
}
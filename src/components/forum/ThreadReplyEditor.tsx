"use client";

import { RichReplyEditor } from "@/components/forum/RichReplyEditor";
import { createReply } from "@/app/forums/actions";
import { useRouter } from "next/navigation";

interface ThreadReplyEditorProps {
    threadId: string;
    currentPath: string;
    currentUserDisplayName: string | null;
    currentUserId: string;
}

export function ThreadReplyEditor({ threadId, currentPath, currentUserDisplayName, currentUserId }: ThreadReplyEditorProps) {
    const router = useRouter();

    const handleSave = async (content: string) => {
        await createReply(threadId, content, currentPath);
        router.refresh();
    };

    return (
        <RichReplyEditor
            placeholder="Share your thoughts, advice, or appreciation..."
            currentUserDisplayName={currentUserDisplayName}
            currentUserId={currentUserId}
            onSave={handleSave}
        />
    );
}

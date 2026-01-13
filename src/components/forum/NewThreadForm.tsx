"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ForumCategory } from "@/types/forum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createThread } from "@/app/forums/actions";
import { Loader2, Send } from "lucide-react";

const formSchema = z.object({
    categoryId: z.string().min(1, "Please select a category"),
    title: z.string().min(5, "Title must be at least 5 characters").max(100),
    content: z.string().min(20, "Content must be at least 20 characters"),
    linkedVaultId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewThreadFormProps {
    categories: ForumCategory[];
    defaultCategory?: string;
}

export function NewThreadForm({ categories, defaultCategory }: NewThreadFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            categoryId: defaultCategory || "",
        },
    });

    const selectedCategoryId = watch("categoryId");

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("categoryId", data.categoryId);
            formData.append("title", data.title);
            formData.append("content", data.content);
            if (data.linkedVaultId) formData.append("linkedVaultId", data.linkedVaultId);

            await createThread(formData);
        } catch (error) {
            console.error("Failed to create thread:", error);
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-6 bg-card border border-border/60 rounded-3xl p-8 shadow-sm">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="categoryId" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                            Forum Category
                        </Label>
                        <Select
                            onValueChange={(val: string) => setValue("categoryId", val)}
                            defaultValue={defaultCategory}
                        >
                            <SelectTrigger className="h-12 rounded-xl bg-secondary/30 border-border/40">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/40 bg-card">
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id} className="rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span>{cat.icon}</span>
                                            <span>{cat.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.categoryId && (
                            <p className="text-xs text-red-500 font-bold ml-1">{errors.categoryId.message}</p>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="title" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                        Thread Title
                    </Label>
                    <Input
                        id="title"
                        placeholder="e.g., How can I tell if this Giant tag is from the 90s?"
                        {...register("title")}
                        className="h-12 rounded-xl bg-secondary/30 border-border/40 text-lg font-bold"
                    />
                    {errors.title && (
                        <p className="text-xs text-red-500 font-bold ml-1">{errors.title.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="content" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                        Content / Description
                    </Label>
                    <Textarea
                        id="content"
                        placeholder="Provide as much detail as possible. For authentication help, describe the stitch, tag, and print quality..."
                        {...register("content")}
                        className="min-h-[250px] rounded-xl bg-secondary/30 border-border/40 resize-none p-4"
                    />
                    {errors.content && (
                        <p className="text-xs text-red-500 font-bold ml-1">{errors.content.message}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 py-4">
                <p className="text-xs text-muted-foreground font-medium">
                    Please follow the community guidelines before posting.
                </p>
                <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="h-14 px-10 rounded-2xl gap-3 text-base font-black shadow-xl shadow-primary/20"
                >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Create Thread
                </Button>
            </div>
        </form>
    );
}

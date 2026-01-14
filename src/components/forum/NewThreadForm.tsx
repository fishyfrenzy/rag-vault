"use client";

import { useState, useRef, useEffect } from "react";
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
import { Loader2, Send, Image as ImageIcon, Package, FolderHeart, AtSign, X, Search } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const formSchema = z.object({
    categoryId: z.string().min(1, "Please select a category"),
    title: z.string().min(5, "Title must be at least 5 characters").max(100),
    content: z.string().min(20, "Content must be at least 20 characters"),
    linkedVaultId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface VaultItem {
    id: string;
    subject: string;
    slug: string;
    reference_image_url: string | null;
    category: string;
}

interface UserResult {
    id: string;
    display_name: string;
    avatar_url: string | null;
}

interface NewThreadFormProps {
    categories: ForumCategory[];
    defaultCategory?: string;
    currentUserId?: string;
}

export function NewThreadForm({ categories, defaultCategory, currentUserId }: NewThreadFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [linkedVaultItems, setLinkedVaultItems] = useState<VaultItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Modal states
    const [showVaultModal, setShowVaultModal] = useState(false);
    const [vaultSearch, setVaultSearch] = useState("");
    const [vaultResults, setVaultResults] = useState<VaultItem[]>([]);
    const [isSearchingVault, setIsSearchingVault] = useState(false);

    // @ Mention states
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionResults, setMentionResults] = useState<UserResult[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const contentValue = watch("content");

    // Handle @ mention detection in content
    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setValue("content", value);

        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf("@");

        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            if (!textAfterAt.includes(" ") && textAfterAt.length > 0) {
                setMentionQuery(textAfterAt);
                setShowMentionDropdown(true);
            } else if (textAfterAt.length === 0) {
                setMentionQuery("");
                setShowMentionDropdown(true);
            } else {
                setShowMentionDropdown(false);
            }
        } else {
            setShowMentionDropdown(false);
        }
    };

    // Search users for mentions
    useEffect(() => {
        if (!showMentionDropdown || mentionQuery.length < 1) {
            setMentionResults([]);
            return;
        }

        const searchUsers = async () => {
            const { data } = await supabase
                .from("profiles")
                .select("id, display_name, avatar_url")
                .ilike("display_name", `%${mentionQuery}%`)
                .limit(5);
            setMentionResults(data || []);
        };

        const debounce = setTimeout(searchUsers, 200);
        return () => clearTimeout(debounce);
    }, [mentionQuery, showMentionDropdown]);

    // Insert mention
    const insertMention = (user: UserResult) => {
        const cursorPos = textareaRef.current?.selectionStart || 0;
        const currentContent = contentValue || "";
        const textBeforeCursor = currentContent.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf("@");
        const textAfterCursor = currentContent.substring(cursorPos);

        const newContent = textBeforeCursor.substring(0, lastAtIndex) + `@${user.display_name} ` + textAfterCursor;
        setValue("content", newContent);
        setShowMentionDropdown(false);
        textareaRef.current?.focus();
    };

    // Image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !currentUserId) return;

        setIsUploading(true);
        const newImages: string[] = [];

        for (const file of Array.from(files)) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUserId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from('forum-images')
                .upload(fileName, file);

            if (!error && data) {
                const { data: { publicUrl } } = supabase.storage
                    .from('forum-images')
                    .getPublicUrl(data.path);
                newImages.push(publicUrl);
            }
        }

        setUploadedImages(prev => [...prev, ...newImages]);
        setIsUploading(false);
    };

    // Search vault items
    useEffect(() => {
        if (!showVaultModal || vaultSearch.length < 2) {
            setVaultResults([]);
            return;
        }

        const search = async () => {
            setIsSearchingVault(true);
            const { data } = await supabase
                .from("the_vault")
                .select("id, subject, slug, reference_image_url, category")
                .ilike("subject", `%${vaultSearch}%`)
                .limit(10);
            setVaultResults(data || []);
            setIsSearchingVault(false);
        };

        const debounce = setTimeout(search, 300);
        return () => clearTimeout(debounce);
    }, [vaultSearch, showVaultModal]);

    const addVaultItem = (item: VaultItem) => {
        if (!linkedVaultItems.find(v => v.id === item.id)) {
            setLinkedVaultItems(prev => [...prev, item]);
        }
        setShowVaultModal(false);
        setVaultSearch("");
    };

    const removeVaultItem = (itemId: string) => {
        setLinkedVaultItems(prev => prev.filter(v => v.id !== itemId));
    };

    const removeImage = (url: string) => {
        setUploadedImages(prev => prev.filter(img => img !== url));
    };

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        try {
            let richContent = data.content;

            // Append vault item references
            if (linkedVaultItems.length > 0) {
                richContent += "\n\n---\n**Referenced Items:**\n";
                linkedVaultItems.forEach(item => {
                    richContent += `- [${item.subject}](/vault/${item.slug})\n`;
                });
            }

            // Append images
            if (uploadedImages.length > 0) {
                richContent += "\n\n";
                uploadedImages.forEach(img => {
                    richContent += `![image](${img})\n`;
                });
            }

            const formData = new FormData();
            formData.append("categoryId", data.categoryId);
            formData.append("title", data.title);
            formData.append("content", richContent);
            if (linkedVaultItems.length > 0) {
                formData.append("linkedVaultId", linkedVaultItems[0].id);
            }

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
                    <div className="relative">
                        <Textarea
                            id="content"
                            placeholder="Provide as much detail as possible. For authentication help, describe the stitch, tag, and print quality..."
                            {...register("content", {
                                onChange: handleContentChange,
                            })}
                            className="min-h-[250px] rounded-xl bg-secondary/30 border-border/40 resize-none p-4"
                        />

                        {/* @ Mention Dropdown */}
                        {showMentionDropdown && mentionResults.length > 0 && (
                            <div className="absolute z-50 bg-card border border-border rounded-xl shadow-xl mt-1 w-64 max-h-48 overflow-y-auto">
                                {mentionResults.map(user => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => insertMention(user)}
                                        className="flex items-center gap-3 w-full p-3 hover:bg-secondary/50 transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-bold">
                                                    {user.display_name?.[0]}
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-medium text-sm">{user.display_name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {errors.content && (
                        <p className="text-xs text-red-500 font-bold ml-1">{errors.content.message}</p>
                    )}

                    {/* Toolbar */}
                    <div className="flex items-center gap-2 pt-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm"
                            title="Upload Image"
                        >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                            <span>Add Image</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowVaultModal(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm"
                            title="Link Vault Item"
                        >
                            <Package className="w-4 h-4" />
                            <span>Link Vault Item</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const currentContent = contentValue || "";
                                setValue("content", currentContent + "@");
                                textareaRef.current?.focus();
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm"
                            title="Mention User"
                        >
                            <AtSign className="w-4 h-4" />
                            <span>Mention</span>
                        </button>
                    </div>
                </div>

                {/* Uploaded Images Preview */}
                {uploadedImages.length > 0 && (
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                            Attached Images
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {uploadedImages.map((url, i) => (
                                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border">
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(url)}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Linked Vault Items */}
                {linkedVaultItems.length > 0 && (
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                            Linked Vault Items
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {linkedVaultItems.map(item => (
                                <div key={item.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50 border border-border/40">
                                    {item.reference_image_url && (
                                        <img src={item.reference_image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                    )}
                                    <div>
                                        <p className="text-sm font-medium">{item.subject}</p>
                                        <p className="text-xs text-muted-foreground">{item.category}</p>
                                    </div>
                                    <button type="button" onClick={() => removeVaultItem(item.id)} className="ml-2 text-muted-foreground hover:text-foreground">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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

            {/* Vault Search Modal */}
            {showVaultModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowVaultModal(false)}>
                    <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-border/40">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold">Link Vault Item</h3>
                                <button type="button" onClick={() => setShowVaultModal(false)} className="p-2 rounded-lg hover:bg-secondary">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    value={vaultSearch}
                                    onChange={(e) => setVaultSearch(e.target.value)}
                                    placeholder="Search vault items..."
                                    className="pl-10 bg-secondary/30 border-border/40 rounded-xl"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="p-4 max-h-[400px] overflow-y-auto">
                            {isSearchingVault ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : vaultResults.length > 0 ? (
                                <div className="space-y-2">
                                    {vaultResults.map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => addVaultItem(item)}
                                            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left"
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                                                {item.reference_image_url ? (
                                                    <img src={item.reference_image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-2xl">👕</div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm truncate">{item.subject}</p>
                                                <p className="text-xs text-muted-foreground">{item.category}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : vaultSearch.length >= 2 ? (
                                <p className="text-center text-muted-foreground py-8">No items found</p>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">Type to search vault items...</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, Image as ImageIcon, Package, FolderHeart, AtSign, X, Search, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface RichReplyEditorProps {
    onSave: (content: string, attachments?: { images: string[], vaultItems: string[], mentions: string[] }) => Promise<void>;
    placeholder?: string;
    currentUserDisplayName?: string | null;
    currentUserId?: string | null;
}

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

export function RichReplyEditor({ onSave, placeholder = "Write a reply...", currentUserDisplayName, currentUserId }: RichReplyEditorProps) {
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [linkedVaultItems, setLinkedVaultItems] = useState<VaultItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Modal states
    const [showVaultModal, setShowVaultModal] = useState(false);
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [vaultSearch, setVaultSearch] = useState("");
    const [vaultResults, setVaultResults] = useState<VaultItem[]>([]);
    const [isSearchingVault, setIsSearchingVault] = useState(false);

    // @ Mention states
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionResults, setMentionResults] = useState<UserResult[]>([]);
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle @ mention detection
    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setContent(value);

        // Check for @ mentions
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf("@");

        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            // Only show dropdown if there's no space after @ and it's a fresh mention
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
        const textBeforeCursor = content.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf("@");
        const textAfterCursor = content.substring(cursorPos);

        const newContent = textBeforeCursor.substring(0, lastAtIndex) + `@${user.display_name} ` + textAfterCursor;
        setContent(newContent);
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

    // Add vault item to post
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

    const handleSubmit = async () => {
        if ((!content.trim() && uploadedImages.length === 0 && linkedVaultItems.length === 0) || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // Build rich content with embedded items
            let richContent = content;

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

            // Extract mentions from content
            const mentionRegex = /@(\w+)/g;
            const mentions = [...content.matchAll(mentionRegex)].map(match => match[1]);

            await onSave(richContent, {
                images: uploadedImages,
                vaultItems: linkedVaultItems.map(v => v.id),
                mentions
            });

            // Reset
            setContent("");
            setUploadedImages([]);
            setLinkedVaultItems([]);
        } catch (error) {
            console.error("Failed to save post:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4 bg-card border border-border/60 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {currentUserDisplayName?.[0] || "U"}
                </div>
                <span className="text-sm font-semibold">Replying as {currentUserDisplayName || "User"}</span>
            </div>

            <div className="relative">
                <Textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleContentChange}
                    placeholder={placeholder}
                    className="min-h-[150px] bg-secondary/30 border-border/40 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl resize-none p-4"
                />

                {/* @ Mention Dropdown */}
                {showMentionDropdown && mentionResults.length > 0 && (
                    <div className="absolute z-50 bg-card border border-border rounded-xl shadow-xl mt-1 w-64 max-h-48 overflow-y-auto">
                        {mentionResults.map(user => (
                            <button
                                key={user.id}
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

            {/* Uploaded Images Preview */}
            {uploadedImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {uploadedImages.map((url, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button
                                onClick={() => removeImage(url)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Linked Vault Items */}
            {linkedVaultItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {linkedVaultItems.map(item => (
                        <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border/40">
                            {item.reference_image_url && (
                                <img src={item.reference_image_url} alt="" className="w-6 h-6 rounded object-cover" />
                            )}
                            <span className="text-xs font-medium truncate max-w-[120px]">{item.subject}</span>
                            <button onClick={() => removeVaultItem(item.id)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/40">
                <div className="flex items-center gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Upload Image"
                    >
                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => setShowVaultModal(true)}
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Link Vault Item"
                    >
                        <Package className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowCollectionModal(true)}
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Link Collection Item"
                    >
                        <FolderHeart className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => {
                            const cursorPos = textareaRef.current?.selectionStart || content.length;
                            setContent(prev => prev.slice(0, cursorPos) + "@" + prev.slice(cursorPos));
                            textareaRef.current?.focus();
                        }}
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Mention User"
                    >
                        <AtSign className="w-5 h-5" />
                    </button>
                </div>

                <Button
                    onClick={handleSubmit}
                    disabled={(!content.trim() && uploadedImages.length === 0 && linkedVaultItems.length === 0) || isSubmitting}
                    className="px-8 gap-2 rounded-xl"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                    Post Reply
                </Button>
            </div>

            {/* Vault Search Modal */}
            {showVaultModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowVaultModal(false)}>
                    <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-border/40">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold">Link Vault Item</h3>
                                <button onClick={() => setShowVaultModal(false)} className="p-2 rounded-lg hover:bg-secondary">
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

            {/* Collection Modal (Similar structure) */}
            {showCollectionModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCollectionModal(false)}>
                    <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-8 text-center" onClick={e => e.stopPropagation()}>
                        <FolderHeart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-bold mb-2">Link Collection Item</h3>
                        <p className="text-muted-foreground text-sm mb-6">Coming soon! You'll be able to reference items from your personal collection.</p>
                        <Button variant="secondary" onClick={() => setShowCollectionModal(false)}>Close</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

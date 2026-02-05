 import { useState } from "react";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { motion } from "framer-motion";
 import { 
   Brain, Sparkles, FileText, Plus, Edit, Trash2, Eye, 
   Check, X, Loader2, RefreshCw, Send, Clock, Tag
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
   DialogFooter,
 } from "@/components/ui/dialog";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { toast } from "sonner";
 import { supabase } from "@/integrations/supabase/client";
 
 interface AIBlogPost {
   id: string;
   title: string;
   slug: string;
   excerpt: string;
   content: string;
   category: string;
   tags: string[];
   author: string;
   status: "draft" | "published" | "archived";
   is_ai_generated: boolean;
   read_time: string;
   created_at: string;
   updated_at: string;
   published_at: string | null;
 }
 
 const categories = [
   { value: "review", label: "Review" },
   { value: "guide", label: "Guide" },
   { value: "news", label: "News" },
   { value: "tips", label: "Tips" },
   { value: "comparison", label: "Comparison" },
   { value: "launch", label: "Launch" },
 ];
 
 export const AIContentManagement = () => {
   const [isGenerating, setIsGenerating] = useState(false);
   const [generateTopic, setGenerateTopic] = useState("");
   const [generateCategory, setGenerateCategory] = useState<string>("guide");
   const [editingPost, setEditingPost] = useState<AIBlogPost | null>(null);
   const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
   
   const queryClient = useQueryClient();
 
   // Fetch blog posts (will work once types are regenerated)
   const { data: blogPosts, isLoading, refetch } = useQuery({
     queryKey: ["ai-blog-posts"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("ai_blog_posts" as any)
         .select("*")
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       return data as unknown as AIBlogPost[];
     },
   });
 
   // Generate new blog with AI
   const generateBlog = async () => {
     if (!generateTopic.trim()) {
       toast.error("Please enter a topic");
       return;
     }
 
     setIsGenerating(true);
     try {
       const { data, error } = await supabase.functions.invoke("generate-blog", {
         body: {
           topic: generateTopic,
           category: generateCategory,
           saveToDraft: true,
         },
       });
 
       if (error) throw error;
       if (data.error) throw new Error(data.error);
 
       toast.success("Blog generated and saved as draft!");
       setGenerateTopic("");
       refetch();
     } catch (error) {
       console.error("Generate error:", error);
       toast.error(error instanceof Error ? error.message : "Failed to generate blog");
     } finally {
       setIsGenerating(false);
     }
   };
 
   // Update blog post
   const updatePost = useMutation({
     mutationFn: async (post: Partial<AIBlogPost> & { id: string }) => {
       const { error } = await supabase
         .from("ai_blog_posts" as any)
         .update({
           ...post,
           updated_at: new Date().toISOString(),
         })
         .eq("id", post.id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success("Post updated!");
       queryClient.invalidateQueries({ queryKey: ["ai-blog-posts"] });
       setIsEditDialogOpen(false);
       setEditingPost(null);
     },
     onError: (error) => {
       toast.error(error instanceof Error ? error.message : "Failed to update");
     },
   });
 
   // Publish/Unpublish post
   const togglePublish = async (post: AIBlogPost) => {
     const newStatus = post.status === "published" ? "draft" : "published";
     await updatePost.mutateAsync({
       id: post.id,
       status: newStatus,
       published_at: newStatus === "published" ? new Date().toISOString() : null,
     } as any);
   };
 
   // Delete post
   const deletePost = async (id: string) => {
     if (!confirm("Are you sure you want to delete this post?")) return;
 
     try {
       const { error } = await supabase
         .from("ai_blog_posts" as any)
         .delete()
         .eq("id", id);
 
       if (error) throw error;
       toast.success("Post deleted!");
       refetch();
     } catch (error) {
       toast.error("Failed to delete post");
     }
   };
 
   const getStatusColor = (status: string) => {
     switch (status) {
       case "published": return "bg-green-500/10 text-green-600";
       case "draft": return "bg-amber-500/10 text-amber-600";
       case "archived": return "bg-muted text-muted-foreground";
       default: return "bg-muted text-muted-foreground";
     }
   };
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h2 className="text-2xl font-bold flex items-center gap-2">
             <Brain className="h-6 w-6 text-primary" />
             AI Content Management
           </h2>
           <p className="text-muted-foreground">Generate, edit, and publish AI-generated content</p>
         </div>
         <Button onClick={() => refetch()} variant="outline" size="sm">
           <RefreshCw className="h-4 w-4 mr-2" />
           Refresh
         </Button>
       </div>
 
       {/* AI Blog Generator */}
       <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Sparkles className="h-5 w-5 text-primary" />
             Generate New Blog with AI
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="md:col-span-2">
               <Label>Topic / Title</Label>
               <Input
                 placeholder="e.g., Best SUVs under 15 Lakhs in 2025, Tata Nexon EV Review..."
                 value={generateTopic}
                 onChange={(e) => setGenerateTopic(e.target.value)}
               />
             </div>
             <div>
               <Label>Category</Label>
               <Select value={generateCategory} onValueChange={setGenerateCategory}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {categories.map((cat) => (
                     <SelectItem key={cat.value} value={cat.value}>
                       {cat.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>
           <Button
             onClick={generateBlog}
             disabled={isGenerating || !generateTopic.trim()}
             className="mt-4 gap-2"
           >
             {isGenerating ? (
               <>
                 <Loader2 className="h-4 w-4 animate-spin" />
                 Generating...
               </>
             ) : (
               <>
                 <Sparkles className="h-4 w-4" />
                 Generate Blog
               </>
             )}
           </Button>
         </CardContent>
       </Card>
 
       {/* Blog Posts Table */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <FileText className="h-5 w-5" />
             AI-Generated Blog Posts
           </CardTitle>
         </CardHeader>
         <CardContent>
           {isLoading ? (
             <div className="flex items-center justify-center py-8">
               <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
           ) : blogPosts && blogPosts.length > 0 ? (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Title</TableHead>
                   <TableHead>Category</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Created</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {blogPosts.map((post) => (
                   <TableRow key={post.id}>
                     <TableCell>
                       <div className="max-w-xs">
                         <p className="font-medium line-clamp-1">{post.title}</p>
                         <p className="text-xs text-muted-foreground line-clamp-1">
                           {post.excerpt}
                         </p>
                       </div>
                     </TableCell>
                     <TableCell>
                       <Badge variant="outline" className="capitalize">
                         {post.category}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       <Badge className={getStatusColor(post.status)}>
                         {post.status}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       <span className="text-sm text-muted-foreground">
                         {new Date(post.created_at).toLocaleDateString("en-IN")}
                       </span>
                     </TableCell>
                     <TableCell className="text-right">
                       <div className="flex items-center justify-end gap-1">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => {
                             setEditingPost(post);
                             setIsEditDialogOpen(true);
                           }}
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => togglePublish(post)}
                         >
                           {post.status === "published" ? (
                             <X className="h-4 w-4 text-amber-500" />
                           ) : (
                             <Send className="h-4 w-4 text-green-500" />
                           )}
                         </Button>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => deletePost(post.id)}
                         >
                           <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                       </div>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           ) : (
             <div className="text-center py-8">
               <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
               <p className="text-muted-foreground">No blog posts yet</p>
               <p className="text-sm text-muted-foreground">
                 Generate your first AI-powered blog post above
               </p>
             </div>
           )}
         </CardContent>
       </Card>
 
       {/* Edit Dialog */}
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
         <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>Edit Blog Post</DialogTitle>
           </DialogHeader>
           {editingPost && (
             <div className="space-y-4">
               <div>
                 <Label>Title</Label>
                 <Input
                   value={editingPost.title}
                   onChange={(e) =>
                     setEditingPost({ ...editingPost, title: e.target.value })
                   }
                 />
               </div>
               <div>
                 <Label>Excerpt</Label>
                 <Textarea
                   value={editingPost.excerpt}
                   onChange={(e) =>
                     setEditingPost({ ...editingPost, excerpt: e.target.value })
                   }
                   rows={2}
                 />
               </div>
               <div>
                 <Label>Content (Markdown)</Label>
                 <Textarea
                   value={editingPost.content}
                   onChange={(e) =>
                     setEditingPost({ ...editingPost, content: e.target.value })
                   }
                   rows={15}
                   className="font-mono text-sm"
                 />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label>Category</Label>
                   <Select
                     value={editingPost.category}
                     onValueChange={(value) =>
                       setEditingPost({ ...editingPost, category: value })
                     }
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       {categories.map((cat) => (
                         <SelectItem key={cat.value} value={cat.value}>
                           {cat.label}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                 <div>
                   <Label>Status</Label>
                   <Select
                     value={editingPost.status}
                     onValueChange={(value) =>
                       setEditingPost({
                         ...editingPost,
                         status: value as "draft" | "published" | "archived",
                       })
                     }
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="draft">Draft</SelectItem>
                       <SelectItem value="published">Published</SelectItem>
                       <SelectItem value="archived">Archived</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>
             </div>
           )}
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
               Cancel
             </Button>
             <Button
               onClick={() => {
                 if (editingPost) {
                   updatePost.mutate({
                     id: editingPost.id,
                     title: editingPost.title,
                     excerpt: editingPost.excerpt,
                     content: editingPost.content,
                     category: editingPost.category,
                     status: editingPost.status,
                   } as any);
                 }
               }}
               disabled={updatePost.isPending}
             >
               {updatePost.isPending ? (
                 <Loader2 className="h-4 w-4 animate-spin mr-2" />
               ) : null}
               Save Changes
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 };
 
 export default AIContentManagement;
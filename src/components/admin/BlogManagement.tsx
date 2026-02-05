import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, Plus, Edit, Trash2, Eye, RefreshCw, FileText, Sparkles, ExternalLink } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[] | null;
  author: string;
  status: string;
  cover_image_url: string | null;
  is_ai_generated: boolean | null;
  views: number | null;
  published_at: string | null;
  created_at: string;
}

const statusOptions = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'published', label: 'Published', color: 'bg-green-100 text-green-800' },
  { value: 'archived', label: 'Archived', color: 'bg-yellow-100 text-yellow-800' },
];

const categoryOptions = [
  'guide', 'news', 'comparison', 'review', 'tips', 'industry'
];

export const BlogManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "guide",
    author: "Grabyourcar Team",
    status: "draft",
    cover_image_url: "",
  });

  // Fetch posts
  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: ['adminBlogPosts', statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('ai_blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  // Update post mutation
  const updatePostMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BlogPost> }) => {
      const { error } = await supabase
        .from('ai_blog_posts')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString(),
          published_at: updates.status === 'published' ? new Date().toISOString() : undefined
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBlogPosts'] });
      toast.success('Post updated successfully');
      setIsEditOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update post');
      console.error(error);
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (post: Omit<BlogPost, 'id' | 'created_at' | 'views' | 'is_ai_generated' | 'published_at' | 'tags'>) => {
      const slug = post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const { error } = await supabase
        .from('ai_blog_posts')
        .insert({
          ...post,
          slug,
          is_ai_generated: false,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBlogPosts'] });
      toast.success('Post created successfully');
      setIsEditOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to create post');
      console.error(error);
    },
  });

  // Generate AI blog
  const generateBlogMutation = useMutation({
    mutationFn: async (topic: string) => {
      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke('generate-blog', {
        body: { topic, category: 'guide' }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminBlogPosts'] });
      toast.success('Blog post generated successfully!');
      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error('Failed to generate blog post');
      console.error(error);
      setIsGenerating(false);
    },
  });

  const handleEdit = (post: BlogPost) => {
    setSelectedPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      author: post.author,
      status: post.status,
      cover_image_url: post.cover_image_url || "",
    });
    setIsEditOpen(true);
  };

  const handleNew = () => {
    setSelectedPost(null);
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category: "guide",
      author: "Grabyourcar Team",
      status: "draft",
      cover_image_url: "",
    });
    setIsEditOpen(true);
  };

  const handleSave = () => {
    if (selectedPost) {
      updatePostMutation.mutate({
        id: selectedPost.id,
        updates: formData
      });
    } else {
      createPostMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusOptions.find(s => s.value === status);
    return <Badge className={config?.color || ''}>{config?.label || status}</Badge>;
  };

  // Stats
  const stats = {
    total: posts?.length || 0,
    published: posts?.filter(p => p.status === 'published').length || 0,
    draft: posts?.filter(p => p.status === 'draft').length || 0,
    aiGenerated: posts?.filter(p => p.is_ai_generated).length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Blog Management</h2>
          <p className="text-muted-foreground">
            Create, edit, and manage blog posts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => generateBlogMutation.mutate('Best SUVs in India 2024')} disabled={isGenerating}>
            <Sparkles className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'AI Generate'}
          </Button>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Posts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
            <p className="text-xs text-muted-foreground">Published</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{stats.aiGenerated}</div>
            <p className="text-xs text-muted-foreground">AI Generated</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : posts && posts.length > 0 ? (
                  posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium line-clamp-1">{post.title}</p>
                            {post.is_ai_generated && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{post.category}</Badge>
                      </TableCell>
                      <TableCell>{post.author}</TableCell>
                      <TableCell>{getStatusBadge(post.status)}</TableCell>
                      <TableCell>{post.views || 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(post.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(post)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No posts found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPost ? 'Edit Post' : 'New Post'}</DialogTitle>
            <DialogDescription>
              {selectedPost ? 'Update blog post details' : 'Create a new blog post'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Post title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Excerpt</Label>
              <Textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Brief description..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Full content (supports markdown)..."
                rows={10}
              />
            </div>

            <div className="space-y-2">
              <Label>Cover Image URL</Label>
              <Input
                value={formData.cover_image_url}
                onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updatePostMutation.isPending || createPostMutation.isPending}>
              {updatePostMutation.isPending || createPostMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

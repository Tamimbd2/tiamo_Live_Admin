import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Loader2, Trash2, Image as ImageIcon, MessageCircle, Heart, Share2 } from "lucide-react";
import toast from "react-hot-toast";

type Post = {
  id: string;
  authorAvatar?: string;
  authorId: string;
  authorName?: string;
  commentCount: number;
  content: string;
  createdAt: any;
  isShare: boolean;
  mediaType?: string;
  mediaUrl?: string;
  originalPostId?: string | null;
  reactionCount: number;
  shareCount: number;
};

export default function SocialPostManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching posts:", error);
      toast.error("Failed to load posts");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    
    setIsDeleting(postId);
    const tid = toast.loading("Deleting post...");
    try {
      await deleteDoc(doc(db, "posts", postId));
      toast.success("Post deleted", { id: tid });
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post", { id: tid });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleSelect = (postId: string) => {
    setSelectedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedPostIds.length} selected posts?`)) return;
    
    const tid = toast.loading("Deleting posts...");
    try {
      for (const id of selectedPostIds) {
        await deleteDoc(doc(db, "posts", id));
      }
      toast.success("Posts deleted", { id: tid });
      setSelectedPostIds([]);
    } catch (error) {
      console.error("Error deleting posts:", error);
      toast.error("Failed to delete posts", { id: tid });
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    let date;
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-pink-500/10 rounded-2xl">
          <ImageIcon className="text-pink-500" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Posts</h1>
          <p className="text-sm text-gray-500">Manage user posts and content</p>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <span className="font-bold text-gray-700 dark:text-gray-300">
          Total Posts: {posts.length}
        </span>
        {selectedPostIds.length > 0 && (
          <button 
            onClick={handleDeleteSelected}
            className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Trash2 size={16} /> Delete Selected ({selectedPostIds.length})
          </button>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-gray-500">No posts available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {posts.map((post) => (
            <div 
              key={post.id} 
              className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow group flex flex-col"
            >
              {/* Header */}
              <div className="p-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-3 overflow-hidden">
                  <input
                    type="checkbox"
                    checked={selectedPostIds.includes(post.id)}
                    onChange={() => handleToggleSelect(post.id)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-pink-500 focus:ring-pink-500 cursor-pointer accent-pink-500 shrink-0"
                  />
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0">
                    {post.authorAvatar ? (
                      <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-gray-500">
                        {post.authorName?.charAt(0) || "U"}
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {post.authorName || "Unknown"}
                    </h3>
                    <p className="text-[10px] text-gray-400 truncate font-mono">
                      {post.authorId}
                    </p>
                  </div>
                </div>
                <button
                  disabled={isDeleting === post.id}
                  onClick={() => handleDelete(post.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors disabled:opacity-50"
                  title="Delete Post"
                >
                  {isDeleting === post.id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="p-4 flex-1">
                <p className="text-sm text-gray-800 dark:text-gray-200 mb-3 whitespace-pre-wrap break-words">
                  {post.content}
                </p>
              </div>

              {/* Media */}
              {post.mediaUrl && (
                <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 relative">
                  {post.mediaType === "video" ? (
                    <video src={post.mediaUrl} className="w-full h-full object-cover" controls />
                  ) : (
                    <img src={post.mediaUrl} alt="Post media" className="w-full h-full object-cover" />
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-950/50 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <Heart size={14} className="text-pink-500" />
                    {post.reactionCount || 0}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <MessageCircle size={14} className="text-blue-500" />
                    {post.commentCount || 0}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <Share2 size={14} className="text-green-500" />
                    {post.shareCount || 0}
                  </div>
                </div>
                <div className="text-[10px] text-gray-400">
                  {formatTime(post.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

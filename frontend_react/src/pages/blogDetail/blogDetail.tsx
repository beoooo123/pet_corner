import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import moment from "moment";
import parse from "html-react-parser";
import blogApi from "../../api/blogApi";
import Loader from "../../components/loader";

interface BlogCategory {
  _id: string;
  name: string;
}

interface Blog {
  _id: string;
  title: string;
  author: string;
  content: string;
  image_url: string;
  status: string;
  blog_category_id?: BlogCategory | string | null;
  createdAt: string;
}

export default function BlogDetail() {
  const { id } = useParams<{ id: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchBlog = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await blogApi.getBlogById(id);
        setBlog(response.data.data);
      } catch (err) {
        console.error("Lỗi khi tải bài viết:", err);
        setError("Không tìm thấy bài viết hoặc bài viết đã bị xóa.");
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [id]);

  if (loading) {
    return <Loader />;
  }

  if (error || !blog) {
    return (
      <div className="mx-auto my-16 flex max-w-2xl flex-col items-center gap-4 px-4 text-center">
        <p className="text-gray-600">{error || "Không tìm thấy bài viết."}</p>
        <Link to="/blogs" className="text-[#FFA500] hover:underline">
          Quay lại danh sách bài viết
        </Link>
      </div>
    );
  }

  const categoryName =
    typeof blog.blog_category_id === "object" ? blog.blog_category_id?.name : undefined;

  return (
    <div className="mx-auto mb-8 mt-4 w-full max-w-full px-3 sm:px-3 md:px-7 lg:px-14 xl:px-[300px]">
      <article className="rounded-lg bg-white p-4 shadow-md sm:p-8">
        {categoryName && (
          <Link
            to="/blogs"
            className="mb-3 inline-block rounded-full bg-[#FFA500]/10 px-3 py-1 text-xs font-medium text-[#FFA500]"
          >
            {categoryName}
          </Link>
        )}
        <h1 className="mb-3 text-2xl font-bold text-gray-800 sm:text-3xl">{blog.title}</h1>
        <div className="mb-6 flex items-center gap-3 text-sm text-gray-500">
          <span>{blog.author}</span>
          <span>•</span>
          <span>{moment(blog.createdAt).format("DD/MM/YYYY")}</span>
        </div>

        {blog.image_url && (
          <img
            src={blog.image_url}
            alt={blog.title}
            className="mb-6 max-h-[420px] w-full rounded-lg object-cover"
          />
        )}

        <div className="prose max-w-none text-gray-700">{parse(blog.content || "")}</div>
      </article>
    </div>
  );
}

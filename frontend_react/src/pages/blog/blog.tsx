import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Input, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import moment from "moment";
import blogApi from "../../api/blogApi";
import blogCategoryApi from "../../api/blogCategoryApi";
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

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "");

const PAGE_SIZE = 9;

export default function Blog() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [visiblePosts, setVisiblePosts] = useState(PAGE_SIZE);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await blogApi.getBlogActive();
        setBlogs(response.data.data || []);
      } catch (error) {
        console.error("Lỗi khi tải danh sách bài viết:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await blogCategoryApi.getCategoriesActive();
        setCategories(response.data.result || []);
      } catch (error) {
        console.error("Lỗi khi tải danh mục bài viết:", error);
      }
    };

    fetchBlogs();
    fetchCategories();
  }, []);

  const filteredBlogs = blogs.filter((blog) => {
    const matchSearch = blog.title.toLowerCase().includes(search.toLowerCase());
    const categoryId =
      typeof blog.blog_category_id === "string"
        ? blog.blog_category_id
        : blog.blog_category_id?._id;
    const matchCategory = selectedCategory === "all" || categoryId === selectedCategory;
    return matchSearch && matchCategory;
  });

  useEffect(() => {
    setVisiblePosts(PAGE_SIZE);
  }, [search, selectedCategory]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="mx-auto mb-4 mt-4 w-full max-w-full px-3 sm:px-3 md:px-7 lg:px-14 xl:px-[154px]">
      <div className="flex flex-wrap lg:flex-nowrap gap-4 items-start">
        <div className="w-full lg:w-1/4 rounded-lg bg-white p-4 shadow-md">
          <h3 className="mb-3 text-base font-semibold text-gray-800">Danh mục bài viết</h3>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setSelectedCategory("all")}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selectedCategory === "all"
                    ? "bg-[#FFA500] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Tất cả bài viết
              </button>
            </li>
            {categories.map((category) => (
              <li key={category._id}>
                <button
                  onClick={() => setSelectedCategory(category._id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedCategory === category._id
                      ? "bg-[#FFA500] text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {category.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full lg:w-3/4">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-white p-3 shadow-md">
            <h2 className="text-lg font-semibold text-gray-800">Bài viết & Kinh nghiệm</h2>
            <Input
              placeholder="Tìm kiếm bài viết..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<SearchOutlined />}
              style={{ maxWidth: 240 }}
            />
          </div>

          {filteredBlogs.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center rounded-lg bg-white text-center shadow-md">
              <p className="text-gray-600">Chưa có bài viết nào phù hợp</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredBlogs.slice(0, visiblePosts).map((blog) => (
                  <Link
                    key={blog._id}
                    to={`/blogs/${blog._id}`}
                    className="group overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg"
                  >
                    <div className="h-44 w-full overflow-hidden bg-gray-100">
                      {blog.image_url ? (
                        <img
                          src={blog.image_url}
                          alt={blog.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          Không có ảnh
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="mb-2 line-clamp-2 text-base font-semibold text-gray-800 group-hover:text-[#FFA500]">
                        {blog.title}
                      </h3>
                      <p className="mb-3 line-clamp-2 text-sm text-gray-500">
                        {stripHtml(blog.content).slice(0, 120)}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{blog.author}</span>
                        <span>{moment(blog.createdAt).format("DD/MM/YYYY")}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {visiblePosts < filteredBlogs.length && (
                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={() => setVisiblePosts((prev) => prev + PAGE_SIZE)}
                    className="border-[#FFA500] text-[#FFA500] hover:bg-[#FFA500] hover:text-white"
                  >
                    Tải thêm bài viết
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

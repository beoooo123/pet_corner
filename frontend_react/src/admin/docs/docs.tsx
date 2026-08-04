import React, { useState } from "react";
import { Card, Menu, Empty } from "antd";
import { ArrowLeftOutlined, FileTextOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Tự động nạp nội dung mọi docs/<feature>/README.md đang có sẵn (dạng chữ thô, chưa qua xử lý)
// Khi skill "explain-feature-flow" viết thêm 1 file docs/<feature>/README.md mới,
// trang này sẽ tự hiện thêm mục đó, không cần sửa code.
const docModules = import.meta.glob("../../../../docs/*/README.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const featureContent: Record<string, string> = {};
Object.entries(docModules).forEach(([path, content]) => {
  const match = path.match(/docs\/([^/]+)\/README\.md$/);
  if (match) {
    featureContent[match[1]] = content;
  }
});

// Danh sách feature dự kiến có tài liệu — khớp với các folder docs/ đã tạo sẵn trong repo.
// Thêm feature mới vào đây khi tạo folder docs/<feature> mới.
const FEATURE_LIST = [
  // Trang chủ & nội dung công khai
  { key: "home", label: "Trang chủ" },
  { key: "home-products", label: "Sản phẩm trang chủ" },
  { key: "banner", label: "Banner trang chủ" },
  { key: "blog", label: "Blog" },
  { key: "contact", label: "Liên hệ" },
  { key: "booking", label: "Đặt lịch (booking)" },
  // Xác thực
  { key: "login", label: "Đăng nhập (login)" },
  { key: "signup", label: "Đăng ký (signup)" },
  // Admin — Sản phẩm & danh mục
  { key: "product", label: "Admin: Sản phẩm" },
  { key: "Getproduct", label: "Lấy sản phẩm (Getproduct)" },
  { key: "category", label: "Admin: Danh mục" },
  { key: "brand", label: "Admin: Thương hiệu" },
  { key: "tag", label: "Admin: Tag" },
  { key: "coupon", label: "Admin: Mã giảm giá" },
  // Admin — Đơn hàng & vận hành
  { key: "order", label: "Admin: Đơn hàng" },
  { key: "payment", label: "Thanh toán VNPay" },
  { key: "paymentType", label: "Admin: Phương thức thanh toán" },
  { key: "delivery", label: "Admin: Phương thức giao hàng" },
  // Admin — Người dùng & dịch vụ
  { key: "user", label: "Admin: Người dùng" },
  { key: "service", label: "Admin: Dịch vụ" },
  // Admin — Hệ thống & báo cáo
  { key: "dashboard", label: "Admin: Tổng quan (dashboard)" },
  { key: "revenue", label: "Admin: Doanh thu" },
];

const markdownComponents = {
  h1: (props: any) => <h1 className="mb-4 mt-6 text-xl font-bold sm:text-2xl" {...props} />,
  h2: (props: any) => <h2 className="mb-3 mt-6 text-lg font-bold sm:text-xl" {...props} />,
  h3: (props: any) => <h3 className="mb-2 mt-4 text-base font-semibold sm:text-lg" {...props} />,
  p: (props: any) => (
    <p className="mb-3 text-sm leading-relaxed text-gray-700 sm:text-base" {...props} />
  ),
  a: (props: any) => <a className="break-words text-[#FFA500] hover:underline" {...props} />,
  li: (props: any) => (
    <li className="mb-1 ml-4 text-sm list-disc leading-relaxed sm:text-base" {...props} />
  ),
  table: (props: any) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full min-w-[500px] border-collapse text-xs sm:text-sm" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th
      className="whitespace-nowrap border border-gray-300 bg-gray-100 p-2 text-left font-semibold"
      {...props}
    />
  ),
  td: (props: any) => <td className="border border-gray-300 p-2 align-top" {...props} />,
  code: (props: any) => {
    const { inline, ...rest } = props;
    return inline ? (
      <code
        className="whitespace-pre-wrap break-words rounded bg-gray-100 px-1 py-0.5 text-[12px] text-pink-600 sm:text-[13px]"
        {...rest}
      />
    ) : (
      <code className="text-[12px] sm:text-[13px]" {...rest} />
    );
  },
  pre: (props: any) => (
    <pre
      className="mb-4 overflow-x-auto rounded-lg bg-gray-900 p-3 text-gray-100 sm:p-4"
      {...props}
    />
  ),
  blockquote: (props: any) => (
    <blockquote
      className="mb-4 border-l-4 border-[#FFA500] bg-blue-50 py-2 pl-4 text-gray-700"
      {...props}
    />
  ),
};

const DocsPage: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState(FEATURE_LIST[0].key);
  const content = featureContent[selectedKey];

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <Link
        to="/admin"
        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#FFA500] sm:mb-4"
      >
        <ArrowLeftOutlined /> Quay lại trang quản trị
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card
        title="Tài liệu giải thích luồng dữ liệu"
        bordered={false}
        className="shadow-sm"
        bodyStyle={{ padding: "16px" }}
      >
        <p className="mb-4 text-xs text-gray-500 sm:text-sm">
          Trang này giải thích cách từng chức năng của hệ thống hoạt động, từ lúc người dùng
          bấm nút trên web cho tới lúc dữ liệu được lưu/lấy trong database — viết cho người
          chưa từng học lập trình cũng đọc hiểu được.
        </p>

        {/* Chọn feature trên mobile/tablet: thanh tab cuộn ngang, gọn hơn menu dọc */}
        <div className="-mx-1 mb-4 overflow-x-auto pb-1 lg:hidden">
          <div className="flex gap-2 px-1">
            {FEATURE_LIST.map((f) => (
              <button
                key={f.key}
                onClick={() => setSelectedKey(f.key)}
                className={`flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                  selectedKey === f.key
                    ? "border-[#FFA500] bg-[#FFA500] text-white"
                    : "border-gray-300 text-gray-600 hover:border-[#FFA500] hover:text-[#FFA500]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Chọn feature trên desktop: menu dọc cố định bên trái */}
          <div className="hidden lg:col-span-1 lg:block">
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              onClick={(e) => setSelectedKey(e.key)}
              items={FEATURE_LIST.map((f) => ({
                key: f.key,
                icon: <FileTextOutlined />,
                label: f.label,
              }))}
            />
          </div>
          <div className="min-w-0 lg:col-span-3">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
              </ReactMarkdown>
            ) : (
              <Empty description="Chưa có tài liệu cho mục này. Dùng skill explain-feature-flow để tạo." />
            )}
          </div>
        </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default DocsPage;

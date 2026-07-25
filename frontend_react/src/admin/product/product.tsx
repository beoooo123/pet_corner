import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Input,
  Select,
  Space,
  Tag,
  notification,
} from "antd";
import { PlusOutlined, EditOutlined, SearchOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import productsApi from "../../api/productsApi";
import brandApi from "../../api/brandApi";
import tagApi from "../../api/tagApi";
import ProductModal from "../components/productModal";
import { Image } from "antd";
import { useLocation } from "react-router-dom";

const { Option } = Select;

interface Product {
  key: string;
  _id: string;
  productCode: string;
  name: string;
  image: string;
  images?: string[];
  quantity: number;
  quantity_sold: number;
  status: string;
  price: string;
  category: string;
  brand?: string;
  tag?: string;
  category_id?: { _id: string; name: string };
  brand_id?: { _id: string; brand_name: string };
  tag_id?: { _id: string; tag_name: string };
  discount?: number;
  image_url?: string[];
  description?: string;
}

interface Brand {
  _id: string;
  brand_name: string;
}

interface Tag {
  _id: string;
  tag_name: string;
}

const removeAccents = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

const ProductList: React.FC = () => {
  const location = useLocation();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | undefined>(() => {
    const params = new URLSearchParams(location.search);
    return params.get("status") || undefined;
  });
  const [filterBrand, setFilterBrand] = useState<string | undefined>(undefined);
  const [filterTag, setFilterTag] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const pageSize = 10;

  const showModal = (product?: Product) => {
    console.log("Product passed to modal:", product);
    setEditingProduct(product || null);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingProduct(null);
  };

  useEffect(() => {
    fetchProducts();
    fetchBrands();
    fetchTags();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [
    searchText,
    filterStatus,
    filterBrand,
    filterTag,
    allProducts,
    currentPage,
  ]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await productsApi.getAll({ limit: "1000" });
      const productList = response.data.result || [];

      if (!Array.isArray(productList)) {
        throw new Error("Dữ liệu không hợp lệ từ API");
      }

      const formattedProducts = productList.map((product: any) => ({
        key: product._id,
        _id: product._id,
        productCode: product._id,
        name: product.name,
        image: product.image_url?.[0] || "",
        images: product.image_url || [],
        quantity: product.quantity || 0,
        quantity_sold: product.quantity_sold || 0,
        status: product.status,
        price: product.price,
        category: product.category_id?.name || "Không xác định",
        brand: product.brand_id?.brand_name || "Không có thương hiệu",
        tag: product.tag_id?.tag_name || "Không có thẻ",
        category_id: product.category_id,
        brand_id: product.brand_id,
        tag_id: product.tag_id,
        discount: product.discount,
        image_url: product.image_url || [],
        description: product.description || "Không có mô tả",
      }));

      setAllProducts(formattedProducts);
      setTotalFiltered(formattedProducts.length);
    } catch (error) {
      notification.error({
        message: "Lỗi",
        description: "Lỗi khi tải danh sách sản phẩm!",
        placement: "topRight",
      });
      console.error("Lỗi khi lấy sản phẩm:", error);
    }
    setLoading(false);
  };

  const fetchBrands = async () => {
    try {
      const response = await brandApi.getAll();
      const brandList = response.data.result || [];
      setBrands(brandList);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách thương hiệu:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await tagApi.getAll();
      const tagList = response.data.result || [];
      setTags(tagList);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách tag:", error);
    }
  };

  const filterProducts = () => {
    let result = [...allProducts];

    if (searchText) {
      const searchNoAccents = removeAccents(searchText.toLowerCase());
      result = result.filter((product) =>
        removeAccents(product.name.toLowerCase()).includes(searchNoAccents)
      );
    }

    if (filterStatus) {
      result = result.filter((product) => product.status === filterStatus);
    }

    if (filterBrand) {
      result = result.filter((product) =>
        product.brand_id && typeof product.brand_id === "object"
          ? product.brand_id._id === filterBrand
          : product.brand_id === filterBrand
      );
    }

    if (filterTag) {
      result = result.filter((product) =>
        product.tag_id && typeof product.tag_id === "object"
          ? product.tag_id._id === filterTag
          : product.tag_id === filterTag
      );
    }

    setTotalFiltered(result.length);
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    setFilteredProducts(result.slice(start, end));
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  const handleStatusChange = async (productId: string, newStatus: string) => {
    try {
      await productsApi.toggleStatus(productId, newStatus);
      notification.success({
        message: "Thành công",
        description: "Cập nhật trạng thái sản phẩm thành công!",
        placement: "topRight",
      });
      fetchProducts();
    } catch (error) {
      notification.error({
        message: "Lỗi",
        description: "Lỗi khi cập nhật trạng thái sản phẩm!",
        placement: "topRight",
      });
      console.error("Toggle status error:", error);
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case "available":
        return "Còn hàng";
      case "out_of_stock":
        return "Hết hàng";
      case "discontinued":
        return "Ngừng kinh doanh";
      default:
        return status;
    }
  };

  const statusOptions = [
    { value: "available", label: "Còn hàng" },
    { value: "out_of_stock", label: "Hết hàng" },
    { value: "discontinued", label: "Ngừng kinh doanh" },
  ];

  const columns = [
    {
      title: "STT",
      key: "index",
      width: 30,
      render: (_: any, __: Product, index: number) =>
        (currentPage - 1) * pageSize + index + 1,
    },
    { title: "Tên sản phẩm", dataIndex: "name", key: "name", width: 400 },
    {
      title: "Ảnh",
      dataIndex: "image",
      key: "image",
      width: 180,
      render: (text: string) => (
        <Image src={text} alt="Product" className="object-cover w-24 h-24" />
      ),
    },
    {
      title: "Giá tiền",
      dataIndex: "price",
      key: "price",
      width: 100,
      render: (price: any) => `${price?.toLocaleString() || 0} VNĐ`,
    },
    { title: "Danh mục", dataIndex: "category", key: "category", width: 200 },
    { title: "Thương hiệu", dataIndex: "brand", key: "brand", width: 200 },
    {
      title: "Tags",
      dataIndex: "tag",
      key: "tag",
      width: 100,
      render: (tag: string) => (tag ? <Tag color="blue">{tag}</Tag> : null),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      render: (quantity: number) => quantity || 0,
    },
    {
      title: "Số lượng đã bán",
      dataIndex: "quantity_sold",
      key: "quantity_sold",
      width: 100,
      render: (quantity_sold: number) => quantity_sold || 0,
    },
    {
      title: "Chức năng",
      key: "action",
      width: 120,
      render: (_: any, record: Product) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => showModal(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        title={
          <Input
            placeholder="Tìm kiếm..."
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
          />
        }
        bordered={false}
        className="shadow-sm"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            Thêm sản phẩm
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Lọc theo trạng thái"
            value={filterStatus}
            onChange={(value) => {
              setFilterStatus(value);
              setCurrentPage(1);
            }}
            style={{ width: 200 }}
            allowClear
          >
            {statusOptions.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="Lọc theo thương hiệu"
            value={filterBrand}
            onChange={(value) => {
              setFilterBrand(value);
              setCurrentPage(1);
            }}
            style={{ width: 200 }}
            allowClear
          >
            {brands.map((brand) => (
              <Option key={brand._id} value={brand._id}>
                {brand.brand_name}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="Lọc theo tag"
            value={filterTag}
            onChange={(value) => {
              setFilterTag(value);
              setCurrentPage(1);
            }}
            style={{ width: 200 }}
            allowClear
          >
            {tags.map((tag) => (
              <Option key={tag._id} value={tag._id}>
                {tag.tag_name}
              </Option>
            ))}
          </Select>
        </Space>
        <Table
          columns={columns}
          dataSource={filteredProducts}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total: totalFiltered,
            onChange: (page) => setCurrentPage(page),
          }}
        />
      </Card>

      <ProductModal
        visible={isModalVisible}
        onClose={closeModal}
        onReload={fetchProducts}
        product={editingProduct}
      />
    </motion.div>
  );
};

export default ProductList;
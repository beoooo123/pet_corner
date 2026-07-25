import React, { useEffect, useState, useContext } from "react";
import { FaFilter } from "react-icons/fa";
import { Button, Row, Col, Typography, Select, Drawer, Pagination } from "antd";
import ListCard from "../../components/listcard";
import Loader from "../../components/loader";
import LeftProductList from "../../components/LeftProductList";
import productsApi from "../../api/productsApi";
import categoryApi from "../../api/categoryApi";
import { SearchContext } from "../../components/searchContext";
import { useLocation } from "react-router-dom";

const { Title, Text } = Typography;
const { Option } = Select;

interface APIProduct {
  discount: number;
  _id: object | string;
  category: string;
  id: any;
  name: string;
  category_id: object | string | null;
  image: string;
  image_url: string;
  detail1: string;
  detail2: string;
  detail3: string;
  detail4: string;
  price: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  brand_id: object | string | null;
  status: string;
  tag_id: object | string | null | (string | object)[];
}

interface Category {
  _id: string;
  name: string;
}

export default function Search() {
  const { keyword, setKeyword } = useContext(SearchContext); // Lấy keyword từ SearchContext
  const location = useLocation();
  const [data, setData] = useState<APIProduct[]>([]);
  const [filteredData, setFilteredData] = useState<APIProduct[]>([]); // Dữ liệu sau khi lọc bằng keyword
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"newest" | "asc" | "desc">("asc");
  const [priceRanges, setPriceRanges] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [openFilter, setOpenFilter] = useState(false);
  const [expandCategories, setExpandCategories] = useState(true);
  const [expandPrice, setExpandPrice] = useState(true);
  const [expandBrand, setExpandBrand] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<Category[]>([]);

  const itemsPerPage = 12;

  // Hàm chuẩn hóa chuỗi để tìm kiếm không phân biệt dấu
  const removeDiacritics = (str: string): string => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  };
  // Lấy keyword từ URL khi component mount
  // Trong Search
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const query = searchParams.get("q") || "";
    if (query && query !== keyword) {
      setKeyword(decodeURIComponent(query));
    } else if (!query && keyword) {
      setKeyword("");
    }
  }, [location.search, setKeyword]);

  // Fetch dữ liệu sản phẩm và danh mục
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const categoryResponse = await categoryApi.getCategoriesActive();
        const categoryData = categoryResponse.data;
        if (categoryData.result && Array.isArray(categoryData.result)) {
          setCategories(categoryData.result);
        } else {
          console.error(
            "Unexpected category response structure:",
            categoryData
          );
        }

        const productResponse = await productsApi.getProductActive();
        const productData = productResponse.data;
        if (productData.result && Array.isArray(productData.result)) {
          setData(productData.result);
        } else {
          console.error("Unexpected product response structure:", productData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Lọc sản phẩm dựa trên keyword
  useEffect(() => {
    if (!keyword.trim()) {
      setFilteredData(data);
      return;
    }

    const normalizedSearchTerm = removeDiacritics(keyword.toLowerCase());
    const filtered = data.filter((product) => {
      const normalizedProductName = removeDiacritics(
        product.name.toLowerCase()
      );
      return normalizedProductName.includes(normalizedSearchTerm);
    });
    setFilteredData(filtered);
    setCurrentPage(1); // Reset về trang đầu khi thay đổi keyword
  }, [keyword, data]);

  const togglePriceRange = (value: string) => {
    setPriceRanges((prev) =>
      prev.includes(value)
        ? prev.filter((range) => range !== value)
        : [...prev, value]
    );
  };

  const toggleBrand = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      const updatedTags = prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId];
      console.log("Tag được chọn:", updatedTags);
      return updatedTags;
    });
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === "all") {
      setSelectedTags([]);
    } else {
      setSelectedTags([]);
    }
  };

  const getPriceRangeFilter = (price: number) => {
    if (priceRanges.length === 0) return true;
    return priceRanges.some((range) => {
      switch (range) {
        case "under150":
          return price < 150000;
        case "150to300":
          return price >= 150000 && price <= 300000;
        case "300to500":
          return price > 300000 && price <= 500000;
        case "500to700":
          return price > 500000 && price <= 700000;
        case "above700":
          return price > 700000;
        default:
          return false;
      }
    });
  };

  const filteredByOtherCriteria = filteredData.filter((item) => {
    const originalPrice = Number(item.price);
    const discountedPrice = originalPrice * (1 - (item.discount || 0) / 100);
    const matchPrice = getPriceRangeFilter(discountedPrice);

    const brandId =
      typeof item.brand_id === "string"
        ? item.brand_id
        : item.brand_id && typeof item.brand_id === "object"
          ? (item.brand_id as { _id: string })._id
          : null;
    const matchBrand =
      selectedBrands.length === 0 ||
      (brandId && selectedBrands.includes(brandId));

    const categoryId =
      typeof item.category_id === "string"
        ? item.category_id
        : item.category_id && typeof item.category_id === "object"
          ? (item.category_id as { _id: string })._id
          : null;
    const matchCategory =
      selectedCategory === "all" ||
      (categoryId && categoryId === selectedCategory);

    let matchTags = true;
    if (selectedCategory !== "all" && selectedTags.length > 0) {
      let itemTags: string[] = [];
      if (typeof item.tag_id === "string") {
        itemTags = [item.tag_id];
      } else if (
        item.tag_id &&
        typeof item.tag_id === "object" &&
        "_id" in item.tag_id
      ) {
        itemTags = [(item.tag_id as { _id: string })._id];
      } else if (Array.isArray(item.tag_id)) {
        itemTags = item.tag_id.map((tag) =>
          typeof tag === "string" ? tag : (tag as { _id: string })._id
        );
      }
      matchTags =
        itemTags.length > 0 &&
        itemTags.some((tag) => selectedTags.includes(tag));
    }

    return matchPrice && matchBrand && matchCategory && matchTags;
  });

  const sortedData = [...filteredByOtherCriteria].sort((a, b) => {
    const priceA = Number(a.price) * (1 - (a.discount || 0) / 100);
    const priceB = Number(b.price) * (1 - (b.discount || 0) / 100);
    if (sort === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sort === "asc") {
      return priceA - priceB;
    } else {
      return priceB - priceA;
    }
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [
    priceRanges,
    selectedBrands,
    selectedTags,
    sort,
    selectedCategory,
    keyword,
  ]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = sortedData.slice(startIndex, endIndex);

  return (
    <div className="mx-auto mb-4 mt-4 w-full max-w-full sm:px-3 md:px-7 lg:px-14 xl:px-[154px] bg-[#e8e8e8]/[0.5] py-3">
      <div className="mt-6">
        <div
          className="flex flex-wrap lg:flex-nowrap gap-1 w-full"
          style={{ alignItems: "flex-start" }}
        >
          <Col
            xs={24}
            sm={8}
            md={6}
            lg={4}
            className="hidden px-2 lg:block bg-white mr-4 flex-shrink-0 rounded-lg shadow-md"
            style={{ position: "sticky", top: "20px" }}
          >
            <LeftProductList
              expandCategories={expandCategories}
              setExpandCategories={setExpandCategories}
              expandPrice={expandPrice}
              setExpandPrice={setExpandPrice}
              expandBrand={expandBrand}
              setExpandBrand={setExpandBrand}
              priceRanges={priceRanges}
              togglePriceRange={togglePriceRange}
              selectedBrands={selectedBrands}
              toggleBrand={toggleBrand}
              selectedTags={selectedTags}
              toggleTag={toggleTag}
              selectedCategory={selectedCategory}
              setSelectedCategory={handleCategoryChange}
              categories={categories}
            />
          </Col>

          <Col
            className="px-4 py-4 bg-white flex-grow rounded-lg shadow-md"
            xs={24}
            sm={24}
            md={24}
            lg={20}
            style={{ height: "fit-content" }}
          >
            <div className="flex w-full items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <Button
                  className="flex items-center gap-2 lg:hidden bg-blue-600 text-white hover:bg-blue-700 text-xs py-1 px-2"
                  onClick={() => setOpenFilter(true)}
                >
                  <FaFilter /> Bộ lọc
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-700">Sắp xếp theo:</span>
                <Select
                  className="w-full min-w-[120px] sm:w-auto"
                  value={sort}
                  onChange={(value) => setSort(value)}
                  dropdownStyle={{ borderRadius: "8px" }}
                  size="small"
                >
                  <Option value="newest">Mới nhất</Option>
                  <Option value="asc">Giá tăng dần</Option>
                  <Option value="desc">Giá giảm dần</Option>
                </Select>
              </div>
            </div>

            {/* Dòng thông báo kết quả tìm kiếm */}
            {keyword.trim() && (
              <div className="mb-4">
                <Text className="text-gray-700 text-3xl flex justify-center">
                  Tìm thấy {sortedData.length} kết quả cho "
                  <strong>{keyword}</strong>"
                </Text>
              </div>
            )}

            {loading ? (
              <div className="flex h-60 items-center justify-center">
                <Loader />
              </div>
            ) : currentPageData.length > 0 ? (
              <div
                className="gap-3"
                style={{
                  height: "auto",
                  minHeight: currentPageData.length > 0 ? "auto" : "60vh",
                }}
              >
                <ListCard pros={{ data: currentPageData }} />
              </div>
            ) : (
              <div className="flex h-60 flex-col items-center justify-center text-center">
                <Title level={4} className="text-gray-600 text-sm">
                  Không tìm thấy sản phẩm nào
                </Title>
                <p className="text-gray-500 text-xs">
                  Vui lòng thử lại với từ khóa hoặc bộ lọc khác
                </p>
              </div>
            )}
          </Col>
        </div>
      </div>

      {sortedData.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Pagination
            current={currentPage}
            total={sortedData.length}
            pageSize={itemsPerPage}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
            className="ant-pagination-custom"
            size="small"
          />
        </div>
      )}

      <Drawer
        placement="left"
        onClose={() => setOpenFilter(false)}
        open={openFilter}
        title={
          <span className="text-sm font-semibold text-gray-800">Bộ lọc</span>
        }
        width={250}
        styles={{ body: { padding: "0" } }}
      >
        <div className="flex h-full flex-col bg-white">
          <div className="flex-grow overflow-auto">
            <LeftProductList
              expandCategories={expandCategories}
              setExpandCategories={setExpandCategories}
              expandPrice={expandPrice}
              setExpandPrice={setExpandPrice}
              expandBrand={expandBrand}
              setExpandBrand={setExpandBrand}
              priceRanges={priceRanges}
              togglePriceRange={togglePriceRange}
              selectedBrands={selectedBrands}
              toggleBrand={toggleBrand}
              selectedTags={selectedTags}
              toggleTag={toggleTag}
              selectedCategory={selectedCategory}
              setSelectedCategory={handleCategoryChange}
              categories={categories}
            />
          </div>
          <div className="mt-auto p-3 border-t">
            <Button
              type="primary"
              className="w-full bg-blue-600 hover:bg-blue-700 rounded-md text-xs"
              onClick={() => setOpenFilter(false)}
              size="small"
            >
              Áp dụng
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

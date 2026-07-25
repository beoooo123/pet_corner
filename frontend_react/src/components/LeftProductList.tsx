import React, { useState, useEffect } from "react";
import { Checkbox, Typography } from "antd";
import { FaChevronUp, FaChevronDown } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import tagApi from "../api/tagApi";
import brandApi from "../api/brandApi";

const { Title } = Typography;

interface Tag {
  _id: string;
  tag_name: string;
  category_id?: string;
}

interface Brand {
  _id: string;
  brand_name: React.ReactNode;
  name: string;
}

interface Category {
  _id: string;
  name: string;
  description?: string;
}

interface LeftProductListProps {
  expandCategories: boolean;
  setExpandCategories: (value: boolean) => void;
  expandPrice: boolean;
  setExpandPrice: (value: boolean) => void;
  expandBrand: boolean;
  setExpandBrand: (value: boolean) => void;
  priceRanges: string[];
  togglePriceRange: (value: string) => void;
  selectedBrands: string[];
  toggleBrand: (brandId: string) => void;
  selectedTags: string[];
  toggleTag: (tagId: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  categories: Category[];
}

export default function LeftProductList({
  expandCategories,
  setExpandCategories,
  expandPrice,
  setExpandPrice,
  expandBrand,
  setExpandBrand,
  priceRanges,
  togglePriceRange,
  selectedBrands,
  toggleBrand,
  selectedTags,
  toggleTag,
  selectedCategory,
  setSelectedCategory,
  categories,
}: LeftProductListProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTagCategory, setExpandedTagCategory] = useState<string | null>(
    null
  );

  const location = useLocation();
  const navigate = useNavigate();

  const getCategoryNameById = (id: string): string => {
    const category = categories.find((cat) => cat._id === id);
    return category ? category.name.toLowerCase().replace(/\s+/g, "-") : "";
  };

  const getCategoryIdByName = (name: string): string => {
    const category = categories.find(
      (cat) => cat.name.toLowerCase().replace(/\s+/g, "-") === name
    );
    return category ? category._id : "";
  };

  const getBrandNameById = (id: string): string => {
    const brand = brands.find((b) => b._id === id);
    return brand
      ? ((brand.brand_name as string) || brand.name)
          .toLowerCase()
          .replace(/\s+/g, "-")
      : "";
  };

  const getBrandIdByName = (name: string): string => {
    const brand = brands.find(
      (b) =>
        ((b.brand_name as string) || b.name)
          .toLowerCase()
          .replace(/\s+/g, "-") === name
    );
    return brand ? brand._id : "";
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get("category");
    const brandsParam = params.get("brands")?.split(",") || [];
    const pricesParam = params.get("prices")?.split(",") || [];
    const tagsParam = params.get("tags")?.split(",") || [];

    if (categoryParam) {
      const categoryId = getCategoryIdByName(categoryParam);
      if (categoryId && categoryId !== selectedCategory) {
        setSelectedCategory(categoryId);
        setExpandedTagCategory(categoryId);
      }
    } else if (selectedCategory !== "all") {
      setSelectedCategory("all");
      setExpandedTagCategory(null);
    }

    if (brandsParam.length > 0) {
      const brandIds = brandsParam
        .map((brandName) => getBrandIdByName(brandName))
        .filter(Boolean);
      brandIds.forEach((id) => {
        if (!selectedBrands.includes(id)) {
          toggleBrand(id);
        }
      });
    }

    if (pricesParam.length > 0) {
      pricesParam.forEach((price) => {
        if (!priceRanges.includes(price)) {
          togglePriceRange(price);
        }
      });
    }

    if (tagsParam.length > 0) {
      tagsParam.forEach((tag) => {
        if (!selectedTags.includes(tag)) {
          toggleTag(tag);
        }
      });
    }
  }, [location.search, categories]);

  const updateURL = (type: string, value: string | string[]) => {
    const params = new URLSearchParams(location.search);

    switch (type) {
      case "category":
        if (value && value !== "all") {
          const categoryName = getCategoryNameById(value as string);
          params.set(type, categoryName);
        } else {
          params.delete(type);
        }
        break;

      case "brands":
        if (Array.isArray(value) && value.length > 0) {
          const brandNames = value
            .map((id) => getBrandNameById(id))
            .filter(Boolean);
          params.set(type, brandNames.join(","));
        } else {
          params.delete(type);
        }
        break;

      default:
        if (Array.isArray(value)) {
          if (value.length > 0) {
            params.set(type, value.join(","));
          } else {
            params.delete(type);
          }
        } else if (value) {
          params.set(type, value as string);
        } else {
          params.delete(type);
        }
    }

    navigate(
      {
        pathname: location.pathname,
        search: params.toString(),
      },
      { replace: true }
    );
  };

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory !== categoryId) {
      setSelectedCategory(categoryId);
      setExpandedTagCategory(categoryId);
      updateURL("category", categoryId);
    } else {
      setExpandedTagCategory(
        expandedTagCategory === categoryId ? null : categoryId
      );
    }
  };

  const handleTagToggle = (tagId: string) => {
    toggleTag(tagId);
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];
    updateURL("tags", newTags);
  };

  const handlePriceToggle = (range: string) => {
    togglePriceRange(range);
    const newPrices = priceRanges.includes(range)
      ? priceRanges.filter((p) => p !== range)
      : [...priceRanges, range];
    updateURL("prices", newPrices);
  };

  const handleBrandToggle = (brandId: string) => {
    toggleBrand(brandId);
    const newBrands = selectedBrands.includes(brandId)
      ? selectedBrands.filter((b) => b !== brandId)
      : [...selectedBrands, brandId];
    updateURL("brands", newBrands);
  };

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoadingTags(true);
        setError(null);
        const response = await tagApi.getAll();
        const tagsData = response.data;
        const tagsArray =
          tagsData.result && Array.isArray(tagsData.result)
            ? tagsData.result
            : [];
        setTags(tagsArray);
      } catch (error) {
        console.error("Error fetching tags:", error);
        setError("Không thể tải danh sách tags");
      } finally {
        setLoadingTags(false);
      }
    };

    const fetchBrands = async () => {
      try {
        setLoadingBrands(true);
        const response = await brandApi.getAll();
        const brandsData = response.data;
        const brandsArray =
          brandsData.result && Array.isArray(brandsData.result)
            ? brandsData.result
            : [];
        setBrands(brandsArray);
      } catch (error) {
        console.error("Error fetching brands:", error);
        setError("Không thể tải danh sách brands");
      } finally {
        setLoadingBrands(false);
      }
    };

    fetchTags();
    fetchBrands();
  }, []);

  return (
    <div className="p-2">
      <div className="cursor-pointer mb-4">
        <div
          className="flex items-center justify-between mb-2"
          onClick={() => setExpandCategories(!expandCategories)}
        >
          <Title level={5} className="mb-0 text-gray-800 font-semibold text-sm">
            DANH MỤC SẢN PHẨM
          </Title>
          {expandCategories ? (
            <FaChevronUp className="text-gray-600 text-xs" />
          ) : (
            <FaChevronDown className="text-gray-600 text-xs" />
          )}
        </div>
        {expandCategories && (
          <ul className="space-y-1">
            <li
              className={`cursor-pointer py-1 px-2 rounded-md transition-colors duration-200 text-xs ${
                selectedCategory === "all"
                  ? "bg-blue-100 text-blue-600 font-bold"
                  : "hover:bg-gray-100 hover:text-blue-600"
              }`}
              onClick={() => {
                setSelectedCategory("all");
                setExpandedTagCategory(null);
                updateURL("category", "all");
              }}
            >
              Tất cả sản phẩm
            </li>
            {categories.map((category) => (
              <li key={category._id} className="cursor-pointer">
                <div
                  className={`flex items-center justify-between py-1 px-2 rounded-md transition-colors duration-200 text-xs ${
                    selectedCategory === category._id
                      ? "bg-blue-100 text-blue-600 font-bold"
                      : "hover:bg-gray-100 hover:text-blue-600"
                  }`}
                  onClick={() => handleCategoryClick(category._id)}
                >
                  <span>{category.name.toUpperCase()}</span>
                  {expandedTagCategory === category._id ? (
                    <FaChevronUp className="text-gray-600 text-xs" />
                  ) : (
                    <FaChevronDown className="text-gray-600 text-xs" />
                  )}
                </div>
                {expandedTagCategory === category._id && (
                  <ul className="ml-4 mt-1 space-y-1">
                    {loadingTags ? (
                      <li className="text-xs text-gray-500">
                        Đang tải tags...
                      </li>
                    ) : error ? (
                      <li className="text-xs text-red-500">{error}</li>
                    ) : tags.length > 0 ? (
                      tags.map((tag) => (
                        <li key={tag._id} className="flex items-center">
                          <Checkbox
                            onChange={() => handleTagToggle(tag._id)}
                            checked={selectedTags.includes(tag._id)}
                            className="text-gray-700 text-xs"
                          >
                            {tag.tag_name}
                          </Checkbox>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-gray-500">Không có tags</li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cursor-pointer mb-4">
        <div
          className="flex items-center justify-between mb-2"
          onClick={() => setExpandPrice(!expandPrice)}
        >
          <Title level={5} className="mb-0 text-gray-800 font-semibold text-sm">
            GIÁ
          </Title>
          {expandPrice ? (
            <FaChevronUp className="text-gray-600 text-xs" />
          ) : (
            <FaChevronDown className="text-gray-600 text-xs" />
          )}
        </div>
        {expandPrice && (
          <div className="space-y-1">
            {[
              { id: "under150", label: "0đ - 150,000đ" },
              { id: "150to300", label: "150,000đ - 300,000đ" },
              { id: "300to500", label: "300,000đ - 500,000đ" },
              { id: "500to700", label: "500,000đ - 700,000đ" },
              { id: "above700", label: "700,000đ - Trở lên" },
            ].map((range) => (
              <React.Fragment key={range.id}>
                <Checkbox
                  onChange={() => handlePriceToggle(range.id)}
                  checked={priceRanges.includes(range.id)}
                  className="text-gray-700 text-xs"
                >
                  {range.label}
                </Checkbox>
                <br />
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div className="cursor-pointer mb-4">
        <div
          className="flex items-center justify-between mb-2"
          onClick={() => setExpandBrand(!expandBrand)}
        >
          <Title level={5} className="mb-0 text-gray-800 font-semibold text-sm">
            BRAND
          </Title>
          {expandBrand ? (
            <FaChevronUp className="text-gray-600 text-xs" />
          ) : (
            <FaChevronDown className="text-gray-600 text-xs" />
          )}
        </div>
        {expandBrand && (
          <div className="space-y-1">
            {loadingBrands ? (
              <div className="text-xs text-gray-500">Đang tải brands...</div>
            ) : error ? (
              <div className="text-xs text-red-500">{error}</div>
            ) : brands.length > 0 ? (
              brands.map((brand) => (
                <div key={brand._id}>
                  <Checkbox
                    onChange={() => handleBrandToggle(brand._id)}
                    checked={selectedBrands.includes(brand._id)}
                    className="text-gray-700 text-xs"
                  >
                    {brand.brand_name || brand.name}
                  </Checkbox>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-500">Không có brands</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
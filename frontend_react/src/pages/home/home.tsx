"use client";
import React from "react";
import { FaUserEdit, FaCalendarAlt } from "react-icons/fa";
import { Button, Space } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import Slider from "react-slick";
import { useState, useEffect, useRef } from "react";
import SaleProduct from "../../components/saleproduct";
import HotProduct from "../../components/hotproduct";
import NewProduct from "../../components/newproduct";
import CateProduct from "../../components/cateproduct";
import "slick-carousel/slick/slick.css"; // Import CSS cho slick
import "slick-carousel/slick/slick-theme.css"; // Import theme CSS
import ENV_VARS from "../../../config";
import productsApi from "../../api/productsApi";
import categoryApi from "../../api/categoryApi";
import bannerApi from "../../api/bannerApi";
import parse from "html-react-parser";
import { Link } from "react-router-dom";

const BannerPrevArrow = ({ onClick }: any) => (
  <button
    onClick={onClick}
    aria-label="Banner trước"
    className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 sm:left-4 sm:h-11 sm:w-11"
  >
    <LeftOutlined />
  </button>
);

const BannerNextArrow = ({ onClick }: any) => (
  <button
    onClick={onClick}
    aria-label="Banner tiếp theo"
    className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 sm:right-4 sm:h-11 sm:w-11"
  >
    <RightOutlined />
  </button>
);

export default function Home() {
  const [newProduct, setNewProduct] = useState([]);
  const [saleProduct, setSaleProduct] = useState([]);
  const [hotProduct, setHotProduct] = useState([]);
  const [productsByCategory, setProductsByCategory] = useState<{
    [key: string]: any[];
  }>({}); // Lưu sản phẩm theo danh mục
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>(
    []
  );

  const [banners, setBanners] = useState<any[]>([]);

  const sliderRef = useRef<any>(null); // Ref cho Slider

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Lấy danh mục
        const categoriesResponse = await categoryApi.getCategoriesActive();
        const categoriesData = await categoriesResponse.data.result;
        setCategories(categoriesData);

        const newProductResponse = await productsApi.getNewProducts();
        const newProductData = newProductResponse.data.result;
        setNewProduct(newProductData || []);

        const saleProductResponse = await productsApi.getSaleproducts();
        const saleProductData = await saleProductResponse.data.result;
        setSaleProduct(saleProductData || []);

        const hotProductResponse = await productsApi.getHotproducts();
        const hotProductData = await hotProductResponse.data.result;
        setHotProduct(hotProductData || []);

        const bannerResponse = await bannerApi.getActive();
        const bannerData = bannerResponse.data.data;
        setBanners(bannerData || []);
      } catch (error) {
        console.error("Error fetching products:", error);
        setCategories([]);
      }
    };
    fetchProducts();
  }, []);

  // Lấy sản phẩm theo danh mục sau khi categories được cập nhật
  useEffect(() => {
    const fetchProductsByCategory = async () => {
      if (categories.length === 0) return; // Không làm gì nếu categories rỗng

      try {
        const categoryPromises = categories.map(async (category) => {
          const productResponse = await productsApi.getProductByCategoryID(
            category._id
          );
          const productData = await productResponse.data.result;
          const limitedProducts = productData ? productData.slice(0, 8) : [];
          return { [category.name]: limitedProducts };
        });

        const categoryProducts = await Promise.all(categoryPromises);
        const productsMap = categoryProducts.reduce((acc, curr) => {
          return { ...acc, ...curr };
        }, {});
        setProductsByCategory(productsMap);
      } catch (error) {
        console.error("Error fetching products by category:", error);
        setProductsByCategory({}); // Reset nếu lỗi
      }
    };
    fetchProductsByCategory();
  }, [categories]);

  // Cấu hình settings cho Slider
  const settings = {
    dots: true,
    infinite: true,
    speed: 1000,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    arrows: banners.length > 1,
    prevArrow: <BannerPrevArrow />,
    nextArrow: <BannerNextArrow />,
    fade: true,
    // Tùy chỉnh style cho dots
    appendDots: (dots) => (
      <div className="custom-dots-container flex justify-center py-4">
        <ul>{dots}</ul>
      </div>
    ),
    customPaging: () => (
      <div className="w-3 h-3 rounded-full bg-white transition-all duration-300"></div>
    ),
  };

  return (
    <>
      {/* Banner */}
      {banners.length > 0 && (
        <div className="mt-4 px-4 sm:px-[40px] lg:px-[154px]">
          <Slider ref={sliderRef} {...settings}>
            {banners.map((banner, index) => {
              const slide = (
                <div
                  key={banner._id || index}
                  className="relative h-[160px] w-full overflow-hidden rounded-lg sm:h-[260px] md:h-[360px] lg:h-[420px]"
                >
                  <img
                    src={banner.image_url}
                    alt={banner.title || `Banner ${index + 1}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              );
              return banner.link_url ? (
                <a
                  key={banner._id || index}
                  href={banner.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {slide}
                </a>
              ) : (
                slide
              );
            })}
          </Slider>
        </div>
      )}

      {/* Sản phẩm mới */}
      <div className="relative mt-[30px] rounded-lg p-6 px-4 sm:px-[40px] lg:px-[154px]">
        <NewProduct data={newProduct} />
      </div>

      {/* Sản phẩm giảm giá */}
      <div className="relative mt-[30px] rounded-lg p-6 px-4 sm:px-[40px] lg:px-[154px]">
        <SaleProduct data={saleProduct} />
      </div>

      {/* Sản phẩm bán chạy */}
      <div className="relative mt-[30px] rounded-lg p-6 px-4 sm:px-[40px] lg:px-[154px]">
        <HotProduct data={hotProduct} />
      </div>

      {/* Sản phẩm theo danh mục */}
      {categories.map((category) => (
        <div
          key={category._id}
          className=" mt-[30px] rounded-lg p-6 px-4 sm:px-[40px] lg:px-[154px]"
        >
          <div className="mx-auto flex h-[50px] w-full max-w-[900px] items-center justify-center rounded-[40px] bg-[#FFA500] text-base font-medium text-white md:text-lg">
            MUA SẮM CHO {category.name.toUpperCase()}
          </div>

          <CateProduct data={productsByCategory[category.name] || []} />

          <div className="mt-6 text-center">
            <Button className="rounded-md border border-gray-300 px-6 py-5 text-base hover:bg-gray-100">
              <Link to={`/product?category=${category.name.toLowerCase()}`}>
                Xem thêm sản phẩm{" "}
                <span className="font-semibold">dành cho {category.name}</span>
              </Link>
            </Button>
          </div>
        </div>
      ))}

      {/* PetNews */}
      <div className="w-full bg-white p-3 sm:p-4 md:p-6 lg:p-8 xl:px-[154px]">
        {/* Brand Logos Section */}
        
      </div>
    </>
  );
}

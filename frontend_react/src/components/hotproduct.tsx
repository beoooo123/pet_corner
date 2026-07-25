import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { Button, Card, message } from "antd";
import Slider from "react-slick";
import { useState, useEffect, useRef } from "react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addToCart } from "../redux/slices/cartslice";

interface Product {
  _id: string;
  name: string;
  price: number;
  image_url: string[];
  discount: number;
  quantity: number;
}

export default function HotProduct({ data }: { data: Product[] }) {
  const [windowWidth, setWindowWidth] = useState(0);
  const sliderRef = useRef<any>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleBuyNow = (product: Product) => {
    const quantity = 1;
    const stockQuantity = product.quantity || Infinity;

    if (quantity > stockQuantity) {
      message.error(`Sản phẩm ${product.name} đã hết hàng!`);
      return;
    }

    const item = {
      id: product._id,
      name: product.name,
      price: Number(product.price * (1 - product.discount / 100)),
      image: product.image_url[0] || "/placeholder-image.jpg",
      stockQuantity: product.quantity || 0,
    };

    dispatch(addToCart({ item, quantity }));
    navigate("/checkout");
  };

  // Hàm điều hướng
  const handlePrevSlide = () => {
    if (sliderRef.current) {
      sliderRef.current.slickPrev(); // Gọi hàm slickPrev từ ref
    }
  };

  const handleNextSlide = () => {
    if (sliderRef.current) {
      sliderRef.current.slickNext(); // Gọi hàm slickNext từ ref
    }
  };

  // Cấu hình settings cho react-slick
  const settings = {
    dots: true,
    infinite: true,
    speed: 1000,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    arrows: false, // Tắt nút điều hướng mặc định
    responsive: [
      {
        breakpoint: 1024, // lg
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768, // md
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 640, // sm
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative ml-[15px] w-[200px] rounded-t-lg border-l border-r border-t border-[#22A6DF] px-2 py-2 sm:ml-[30px] sm:w-[250px] sm:px-4 md:w-[300px]">
          <div className="absolute -top-7 left-3 z-10 bg-white px-2">
            <img
              src="/images/icons/paw.png"
              alt="Paw Icon"
              className="h-8 w-8 sm:h-12 sm:w-12 md:h-[50px] md:w-[50px]"
            />
          </div>
          <h2 className="relative z-20 text-center text-base font-semibold sm:text-lg">
            SẢN PHẨM BÁN CHẠY
          </h2>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          <Button
            shape="circle"
            icon={<FaChevronLeft />}
            onClick={handlePrevSlide}
            className="border-black shadow-md transition-colors duration-300 hover:bg-[#22A6DF] hover:text-white"
            disabled={data.length === 0}
          />
          <Button
            shape="circle"
            icon={<FaChevronRight />}
            onClick={handleNextSlide}
            className="border-black shadow-md transition-colors duration-300 hover:bg-[#22A6DF] hover:text-white"
            disabled={data.length === 0}
          />
        </div>
      </div>

      {/* Product List */}
      <div className="overflow-hidden rounded-xl border-2 px-2 py-[25px] sm:rounded-3xl sm:border-4 sm:px-4 sm:py-[50px]">
        <Slider ref={sliderRef} {...settings}>
          {data.map((product: Product, index: number) => (
            <Card
              key={`${product._id}-${index}`}
              className={`min-w-0 flex-1 transform border-none shadow-none transition-all duration-1000 ease-in-out`}
              styles={{ body: { padding: 0 } }}
            >
              <div className="flex">
                <div className="w-1/4">
                  <Link to={`/detail/${product._id}`}>
                    <img
                      src={`${product.image_url[0]}`}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                    />
                  </Link>
                </div>
                <div className="flex w-3/4 flex-col justify-between p-2">
                  <p className="text-xs font-bold sm:text-sm">{product.name}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-sm font-bold text-[#22A6DF] transition-colors duration-300 sm:text-base">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(
                        Number(product.price * (1 - product.discount / 100))
                      )}
                    </p>
                    {product.discount > 0 && (
                      <p className="text-sm text-gray-400 line-through sm:text-base">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(Number(product.price))}
                      </p>
                    )}
                    {product.discount > 0 && (
                      <div className="border border-red-500 px-2 py-1 text-xs font-semibold text-[#FF0000]">
                        {product.discount}%
                      </div>
                    )}
                  </div>
                  <Button
                    className="mt-2 w-[90px] bg-[#22A6DF] hover:bg-[#1890ff] hover:border-[#22A6DF] rounded-lg text-white text-xs sm:w-[120px] sm:text-sm"
                    onClick={() => handleBuyNow(product)}
                  >
                    Mua ngay
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </Slider>
      </div>
    </>
  );
}
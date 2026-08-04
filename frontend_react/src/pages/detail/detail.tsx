import React, { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  Breadcrumb,
  Button,
  Image,
  Avatar,
  Divider,
  message,
  Badge,
} from "antd";
import { motion } from "framer-motion";
import { Star, ThumbsUp, MessageCircle, Clock, Award } from "lucide-react";
import productsApi from "../../api/productsApi";
import { useDispatch } from "react-redux";
import { addToCart } from "../../redux/slices/cartslice";
import parse from "html-react-parser";
import Slider, { Settings } from "react-slick";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { BsHeart } from "react-icons/bs";

export default function DetailProduct() {
  const params = useParams();
  const location = useLocation();
  const [selectedImage, setSelectedImage] = useState("");
  const [likes, setLikes] = useState<{ [key: number]: boolean }>({});
  const [quantity, setQuantity] = useState(1);
  const sliderRef = useRef<any>(null);

  const [comments, setComments] = useState<
    {
      id: number;
      userName: string;
      userAvatar: string;
      content: string;
      score: number;
      createdAt: string;
      likes: number;
      discount?: number;
    }[]
  >([]);
  const [productsDetail, setProductDetail] = useState<{
    _id?: string;
    id?: string;
    name?: string;
    brand?: string;
    tag?: string;
    status?: string;
    price?: string;
    image_url: string[];
    discount?: number;
    quantity?: number;
    description?: string;
    details?: string[];
  } | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<
    {
      _id?: string;
      id?: string;
      name?: string;
      price?: string;
      image_url?: string[];
    }[]
  >([]);
  const dispatch = useDispatch();

  // Cuộn đến phần đánh giá khi có hash #reviews
  useEffect(() => {
    if (location.hash !== "#reviews" || !productsDetail) return;

    const reviewsSection = document.getElementById("reviews");
    if (reviewsSection) {
      reviewsSection.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash, productsDetail]);

  // Fetch product detail và related products
  useEffect(() => {
    const fetchData = async () => {
      try {
        const productDetailResponse = await productsApi.getProductByID(
          params.id
        );
        const productDetailData = productDetailResponse.data.product;
        setProductDetail({
          ...productDetailData,
          brand: productDetailData.brand || "Sắc Màu TPet",
          tag: productDetailData.tag || "Sản phẩm đồ chơi cho chó",
          status: productDetailData.status || "available",
          price: productDetailData.price || "0",
          image_url: productDetailData.image_url || [],
        });

        const relatedResponse = await productsApi.getProductRelatedList(
          params.id
        );
        setRelatedProducts(relatedResponse.data || []);
      } catch (error) {
        console.error("Error fetching product data:", error);
      }
    };
    fetchData();
  }, [params.id]);

  const handleLike = async (ratingId: number) => {
    // Đánh giá sản phẩm chưa được hỗ trợ trong bản cơ bản này.
  };

  const product = productsDetail;
  if (!product)
    return <div>Không tìm thấy sản phẩm. Vui lòng kiểm tra lại.</div>;

  const handleImageClick = (image) => setSelectedImage(image);
  const handlePrevImage = () => {
    const images = product.image_url;
    const currentIndex = images.indexOf(selectedImage || images[0]);
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    setSelectedImage(images[prevIndex]);
  };
  const handleNextImage = () => {
    const images = product.image_url;
    const currentIndex = images.indexOf(selectedImage || images[0]);
    const nextIndex = (currentIndex + 1) % images.length;
    setSelectedImage(images[nextIndex]);
  };
  const handleChange = (event) => {
    const value = event.target.value;
    if (/^\d+$/.test(value)) {
      const newQuantity = Number(value);
      const maxQuantity = productsDetail?.quantity || 1;

      if (newQuantity > maxQuantity) {
        message.error(`Số lượng vượt quá tồn kho!`);
        setQuantity(maxQuantity);
      } else {
        setQuantity(Math.max(1, newQuantity));
      }
    }
  };

  const handleIncrement = () => {
    const maxQuantity = productsDetail?.quantity || 1;
    if (quantity + 1 > maxQuantity) {
      message.error(`Số lượng vượt quá tồn kho!`);
    } else {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };
  const handleAddToCart = () => {
    const maxQuantity = productsDetail?.quantity || 1;
    if (quantity > maxQuantity) {
      message.error(`Số lượng vượt quá tồn kho! Tối đa: ${maxQuantity}`);
      return;
    }
    const item = {
      id: product._id || product.id,
      name: product.name,
      price: Number(
        Number(product.price || 0) * (1 - Number(product.discount || 0) / 100)
      ),
      image: product.image_url[0],
      stockQuantity: productsDetail?.quantity || 0, // Đảm bảo lưu stockQuantity
    };
    console.log("Adding to cart:", item); // Kiểm tra dữ liệu trước khi dispatch
    dispatch(addToCart({ item, quantity }));
    message.success("Đã thêm vào giỏ hàng!");
  };
  const handleBuyNow = () => {
    handleAddToCart();
    window.location.href = "/checkout";
  };
  const formatDate = (dateString) => {
    const options = {
      year: "numeric" as const,
      month: "long" as const,
      day: "numeric" as const,
    };
    return new Date(dateString).toLocaleDateString("vi-VN", options);
  };

  const displayStatus =
    product.status === "available" ? "Còn hàng" : product.status;

  const averageScore =
    comments.length > 0
      ? Math.round(
          comments.reduce((sum, review) => sum + review.score, 0) /
            comments.length
        )
      : 0;

  const totalReviews = comments.length;

  const sliderSettings: Settings = {
    dots: true, // Bật chấm điều hướng
    arrows: false,
    infinite: true, // Lướt vô hạn
    speed: 1000,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true, // Tự động chạy
    autoplaySpeed: 2000, // Tốc độ tự động chạy
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

  function handleNavigateToProduct(_id: string | undefined): void {
    if (!_id) {
      console.error("Product ID is undefined");
      return;
    }
    window.location.href = `/detail/${_id}`;
  }
  return (
    <div className="text-black">
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-[154px] py-6 lg:py-10">
        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Section */}
          <div className="lg:sticky lg:top-0 h-fit">
            <div className="flex flex-col-reverse lg:flex-row items-center lg:items-start gap-4 lg:gap-6">
              {/* Thumbnail Images */}
              <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-x-visible w-full lg:w-auto">
                {product.image_url.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Detail ${index + 1}`}
                    className={`w-16 h-16 lg:w-20 lg:h-20 flex-shrink-0 cursor-pointer rounded-lg border object-cover transition-all duration-300 ${
                      selectedImage === image
                        ? "border-[#28A745]"
                        : "border-[#EAEAEA] hover:border-[#28A745]"
                    }`}
                    onClick={() => handleImageClick(image)}
                  />
                ))}
              </div>

              {/* Main Image */}
              <div className="relative w-full lg:w-[602px] aspect-square">
                <Image
                  src={selectedImage || product.image_url[0]}
                  alt="Main product"
                  className="w-full h-full rounded-lg border border-[#EAEAEA] shadow-md transition-all duration-300 object-contain hover:scale-105"
                  preview={{
                    mask: "Xem ảnh lớn",
                    maskClassName: "custom-preview-mask",
                  }}
                />
                {product.image_url.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      aria-label="Ảnh trước"
                      className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                    >
                      <FaChevronLeft />
                    </button>
                    <button
                      onClick={handleNextImage}
                      aria-label="Ảnh tiếp theo"
                      className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                    >
                      <FaChevronRight />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Product Info Section */}
          <div className="flex flex-col space-y-4">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
              {product.name}
            </h1>

            <div className="flex items-center">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= averageScore
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-200 fill-gray-200"
                    }`}
                  />
                ))}
              </div>
              <span className="ml-2 text-xs lg:text-sm text-gray-600">
                ({totalReviews} đánh giá)
              </span>
            </div>

            {/* Product Details */}
            <div className="text-xs lg:text-sm text-gray-600 space-y-1">
              <p>
                <span className="font-semibold">Thương hiệu:</span>{" "}
                {product.brand}
              </p>
              <p>
                <span className="font-semibold">Thẻ:</span> {product.tag}
              </p>
              <p>
                <span className="font-semibold">Tình trạng:</span>{" "}
                {displayStatus}
              </p>
            </div>

            {/* Price Section */}
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xl lg:text-2xl font-bold text-[#FF0000]">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(
                  Number(product.price) * (1 - (product.discount || 0) / 100)
                )}
              </span>
              {(product.discount ?? 0) > 0 && (
                <>
                  <span className="text-xs lg:text-sm text-[#686868] line-through">
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(Number(product.price))}
                  </span>
                  <span className="text-xs lg:text-sm rounded border border-[#FF0000] px-2 py-1 font-medium text-[#FF0000]">
                    -{product.discount}%
                  </span>
                </>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="font-semibold text-sm lg:text-base">
                Số lượng:
              </span>
              <div className="flex items-center border rounded-lg">
                <Button onClick={handleDecrement} className="px-3 lg:px-4 py-2">
                  -
                </Button>
                <input
                  min={1}
                  value={quantity}
                  onChange={handleChange}
                  className="w-8 lg:w-12 text-center border-none"
                />
                <Button
                  onClick={handleIncrement}
                  className="px-3 lg:px-4 py-2"
                  disabled={quantity >= (productsDetail?.quantity || 1)} // Vô hiệu hóa nút tăng nếu đạt tối đa
                >
                  +
                </Button>
              </div>
              <span className="text-sm text-gray-500">
                (Số lượng hàng còn: {productsDetail?.quantity || 0})
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="w-full sm:w-auto rounded-lg bg-[#FFA500] px-4 lg:px-6 py-3 lg:py-5 text-white text-sm lg:text-base"
                onClick={handleAddToCart}
              >
                Thêm vào giỏ hàng
              </Button>
              <Button
                className="w-full sm:w-auto rounded-lg bg-[#FF0000] px-4 lg:px-6 py-3 lg:py-5 text-white text-sm lg:text-base"
                onClick={handleBuyNow}
              >
                MUA NGAY
              </Button>
            </div>

            {/* Product Description */}
            <div className="mt-6">
              <h2 className="text-lg lg:text-xl font-bold text-gray-800 mb-3">
                Thông tin sản phẩm
              </h2>
              <div className="text-sm lg:text-base text-gray-600">
                {parse(product.description || "")}
              </div>
              <ul className="pl-6 mt-3 text-sm lg:text-base text-gray-600 list-disc">
                {product.details?.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-8"
          id="reviews"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            Đánh giá từ khách hàng
          </h2>

          {/* Rating Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
            {/* Average Rating Card */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl shadow-sm">
              <div className="text-4xl font-bold text-[#FFA500] mb-2">
                {comments.length > 0
                  ? (
                      comments.reduce((sum, review) => sum + review.score, 0) /
                      comments.length
                    ).toFixed(1)
                  : "0.0"}
              </div>
              <div className="flex text-yellow-400 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= averageScore ? "fill-yellow-400" : "fill-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-gray-600">Dựa trên {totalReviews} đánh giá</p>
            </div>

            {/* Rating Bars */}
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((num) => {
                const count = comments.filter(
                  (review) => review.score === num
                ).length;
                const percentage = comments.length
                  ? (count / comments.length) * 100
                  : 0;

                return (
                  <div key={num} className="flex items-center gap-3">
                    <div className="flex items-center w-16">
                      <span className="text-sm font-medium text-gray-700">
                        {num}
                      </span>
                      <Star className="w-4 h-4 text-yellow-400 ml-1" />
                    </div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-[#FFA500] rounded-full"
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-12">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-700">
                <Award className="w-5 h-5 text-green-500" />
                <span>
                  {comments.filter((r) => r.score === 5).length} đánh giá xuất
                  sắc
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Clock className="w-5 h-5 text-blue-500" />
                <span>
                  Cập nhật gần đây nhất:{" "}
                  {comments.length > 0
                    ? formatDate(comments[0].createdAt)
                    : "Chưa có đánh giá"}
                </span>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-6">
            {comments.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.5,
                  ease: "easeOut",
                }}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Avatar
                      src={review.userAvatar || "/default-avatar.png"}
                      alt={review.userName}
                      size={48}
                      className="rounded-full"
                    />
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-3">
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      >
                        <h4 className="font-semibold text-gray-800 mb-1">
                          {review.userName}
                        </h4>
                        <div className="flex items-center gap-3">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <motion.div
                                key={star}
                                whileHover={{ scale: 1.2 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    star <= review.score
                                      ? "text-yellow-400 fill-yellow-400"
                                      : "text-gray-200 fill-gray-200"
                                  }`}
                                />
                              </motion.div>
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString(
                              "vi-VN"
                            )}
                          </span>
                        </div>
                      </motion.div>
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="text-gray-700 leading-relaxed mb-4"
                    >
                      {review.content}
                    </motion.p>
                    <div className="flex items-center gap-4 mt-4">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleLike(review.id)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all ${
                          likes[review.id]
                            ? "bg-blue-100 text-blue-600"
                            : "text-gray-500 hover:text-blue-600"
                        }`}
                      >
                        <ThumbsUp
                          className={`w-4 h-4 ${
                            likes[review.id] ? "fill-blue-600" : ""
                          }`}
                        />
                        <motion.span
                          initial={{ scale: 1 }}
                          animate={{
                            scale: likes[review.id] ? [1, 1.3, 1] : 1,
                          }}
                          transition={{ duration: 0.3 }}
                          className="text-sm"
                        >
                          {review.likes} Thích
                        </motion.span>
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {comments.length === 0 && (
            <div className="text-center py-10">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Chưa có đánh giá nào cho sản phẩm này
              </p>
            </div>
          )}
        </motion.div>

        {/* Related Products */}
        <div className="mt-8">
          <h3 className="text-lg lg:text-xl font-bold mb-4">
            SẢN PHẨM LIÊN QUAN
          </h3>
          {relatedProducts.length > 0 ? (
            <Slider ref={sliderRef} {...sliderSettings}>
              {relatedProducts.map((product, index) => (
                <motion.div
                  key={product._id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <div className="group relative h-full overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-300 hover:shadow-xl">
                    {/* Image Container */}
                    <div
                      onClick={() => handleNavigateToProduct(product._id)} // Điều hướng khi nhấn vào sản phẩm
                      className="cursor-pointer"
                    >
                      <div className="relative mb-4 overflow-hidden rounded-lg pt-[100%]">
                        <motion.div
                          className="absolute inset-0 overflow-hidden"
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.4 }}
                        >
                          <img
                            src={
                              product.image_url?.[0] || "/placeholder-image.jpg"
                            }
                            alt={product.name}
                            className="h-full w-full object-contain transition-all duration-500"
                          />
                          {product.image_url?.[1] && (
                            <img
                              src={product.image_url[1]}
                              alt={product.name}
                              className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            />
                          )}
                        </motion.div>
                      </div>
                    </div>

                    {/* Discount Badge */}
                    {Number(product.discount) > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 left-10"
                      >
                        <Badge.Ribbon
                          text={`-${product.discount}%`}
                          color="red"
                          className="font-semibold"
                        />
                      </motion.div>
                    )}

                    {/* Product Info */}
                    <div className="space-y-3 px-2 text-center">
                      {/* Name */}
                      <h3
                        onClick={() => handleNavigateToProduct(product._id)} // Điều hướng khi nhấn vào tên sản phẩm
                        className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-gray-800 transition-colors duration-300 group-hover:text-[#FFA500] cursor-pointer"
                      >
                        {product.name}
                      </h3>

                      {/* Price */}
                      <div className="flex flex-row items-center justify-center gap-1 sm:flex-row sm:gap-2">
                        <motion.p
                          className="text-lg font-bold text-[#FFA500]"
                          whileHover={{ scale: 1.05 }}
                        >
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                          }).format(
                            Number(product.price) *
                              (1 - (product.discount || 0) / 100)
                          )}
                        </motion.p>

                        {product.discount > 0 && (
                          <p className="text-xs text-gray-500 line-through">
                            {new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            }).format(Number(product.price))}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </Slider>
          ) : (
            <p className="text-gray-500 text-center">
              Không có sản phẩm liên quan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Badge, Button, Card, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { BsHandbag, BsHeart, BsStarFill } from "react-icons/bs";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";
import { addToCart } from "../redux/slices/cartslice";

interface APIProduct {
  _id: string;
  name: string;
  image_url: string[];
  price: number;
  discount: number;
  quantity: number;
}

export default function CateProduct({ data }: { data: APIProduct[] }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleBuyNow = (product: APIProduct) => {
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

  return (
    <div className="container md:px-4">
      <div className="mt-4 grid grid-cols-2 gap-4 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {data.map((product) => (
          <motion.div
            key={product._id.toString()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <Card
              className="group relative h-full overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-300 hover:shadow-xl"
              bodyStyle={{ padding: 0 }}
            >
              {/* Discount Badge */}
              {product.discount > 0 && (
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
                {/* Name */}
                <Link to={`/detail/${product._id}`}>
                  <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-gray-800 transition-colors duration-300 group-hover:text-[#FFA500]">
                    {product.name}
                  </h3>
                </Link>

                {/* Price */}
                <div className="flex flex-row items-center justify-center gap-1 sm:flex-row sm:gap-2">
                  <motion.p 
                    className="text-lg font-bold text-[#FFA500]"
                    whileHover={{ scale: 1.05 }}
                  >
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(Number(product.price * (1 - product.discount / 100)))}
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

                {/* Buy Button */}
                <motion.div 
                  className="relative overflow-hidden rounded-lg mt-auto"
                  whileHover={{ scale: 1.02 }}
                >
                    <Button 
                      className="w-full bg-transparent hover:bg-[#FFA500] border-[#FFA500] text-[#FFA500] hover:text-white transition-all duration-300 uppercase font-medium"
                      onClick={() => handleBuyNow(product)}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <BsHandbag className="text-lg" />
                        <span>Mua ngay</span>
                      </div>
                    </Button>
                </motion.div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
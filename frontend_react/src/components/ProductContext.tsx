// ProductContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import productsApi from "../api/productsApi";

interface Product {
  _id?: string;
  id?: string;
  name: string;
  price: string | number;
  image_url: string[];
  oldPrice?: string | number;
  discount?: number;
  description?: string;
  details?: string[];
  brand?: string;
  tag?: string;
  status?: string;
  category_id?: { name: string };
}

interface ProductContextType {
  product: Product | null;
  loading: boolean;
  error: string | null;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await productsApi.getProductByID(id);
          setProduct({
            ...response.data.product,
            brand: response.data.product.brand || "Sắc Màu TPet",
            tag: response.data.product.tag || "Sản phẩm đồ chơi cho chó",
            status: response.data.product.status || "available",
          });
        } catch (err) {
          setError("Không thể tải thông tin sản phẩm");
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id]);

  return (
    <ProductContext.Provider value={{ product, loading, error }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProduct must be used within a ProductProvider");
  }
  return context;
};
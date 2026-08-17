import React, { useEffect, useState } from "react";
import { FaFilter } from "react-icons/fa";
import { Button, Row, Col, Typography, Select, Drawer, Pagination } from "antd";
import ListCard from "../../components/listcard";
import Loader from "../../components/loader";
import LeftProductList from "../../components/LeftProductList";
import productsApi from "../../api/productsApi";
import categoryApi from "../../api/categoryApi";

const { Title } = Typography;
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
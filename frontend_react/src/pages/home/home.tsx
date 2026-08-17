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
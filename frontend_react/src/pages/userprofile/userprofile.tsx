"use client";
import React, { useEffect, useState } from "react";
import { Avatar, Card } from "antd";
import { FaUser, FaEdit } from "react-icons/fa";
import { Routes, Route, useParams, useNavigate } from "react-router-dom";
import userApi from "../../api/userApi";
import Account from "../../components/account";
import Address from "../../components/address";
import ChangePassword from "../../components/change-password";

interface User {
  _id: string;
  email: string;
  fullname: string;
  password: string;
  phone_number: string;
  address: Address[];
  role: string;
  avatar: string;
  reset_password_token: string | null;
  reset_password_expires: string | null;
  refreshToken: string;
  dateOfBirth: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface Address {
  name: string;
  phone: string;
  address: string;
}

export default function UserProfile() {
  const params = useParams();
  const type = params["*"] || "account";
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("accessToken");
      const accountID = localStorage.getItem("accountID")?.replace(/"/g, "").trim();

      if (!token || !accountID) {
        setUser(null);
        return;
      }

      try {
        const userResponse = await userApi.getUserById(accountID);
        setUser(userResponse.data.data);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        setUser(null);
      }
    };

    fetchUserData();
  }, []);


  const renderSidebar = () => (
    <Card className="w-full md:w-1/5 border-none" styles={{ body: { padding: 0 } }}>
      <div className="mb-4 flex items-center gap-4">
        <Avatar size={75} src={user?.avatar || "/images/avatar/avatar1.png"} />
        <div>
          <h2 className="text-lg font-bold text-gray-800">{user?.fullname}</h2>
          <p
            className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:underline"
            onClick={() => navigate("/userprofile/account")}
          >
            <FaEdit /> Sửa hồ sơ
          </p>
        </div>
      </div>
      <div className="space-y-2 text-lg text-gray-600">
        <div className="flex items-center gap-2">
          <FaUser className="text-[#22A6DF]" /> Tài khoản của tôi
        </div>
        <div
          className={`ml-7 cursor-pointer ${type === "account" ? "text-[#22A6DF]" : "text-gray-600"}`}
          onClick={() => navigate("/userprofile/account")}
        >
          Hồ sơ
        </div>
        <div
          className={`ml-7 cursor-pointer ${type === "address" ? "text-[#22A6DF]" : "text-gray-600"}`}
          onClick={() => navigate("/userprofile/address")}
        >
          Địa chỉ
        </div>
        <div
          className={`ml-7 cursor-pointer ${type === "change-password" ? "text-[#22A6DF]" : "text-gray-600"}`}
          onClick={() => navigate("/userprofile/change-password")}
        >
          Đổi mật khẩu
        </div>
      </div>
    </Card>
  );

  return (
    <div className="flex my-6 flex-col gap-6 md:flex-row md:gap-8 sm:px-[40px] lg:px-[154px]">
      {renderSidebar()}
      <Card className="w-full md:w-4/5 rounded-lg border border-gray-200 shadow-md">
        <Routes>
          <Route path="account" element={<Account />} />
          <Route path="address" element={<Address />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="*" element={<div>Trang không tồn tại</div>} />
        </Routes>
      </Card>
    </div>
  );
}
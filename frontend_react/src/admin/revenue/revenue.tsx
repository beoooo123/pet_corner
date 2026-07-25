import React, { useEffect, useState } from 'react';
import { Table, DatePicker, Select, Typography, Space, Button, message, Spin, Divider, Form } from 'antd';
import dayjs from 'dayjs';
import revenueApi from '../../api/revenueAPI';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import debounce from 'lodash/debounce';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

interface RevenueItem {
  date: string;
  salesRevenue: number;
  serviceRevenue: number;
  totalRevenue: number;
}

const RevenuePage: React.FC = () => {
  const [data, setData] = useState<RevenueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [chartLimit, setChartLimit] = useState(3); // Default to 3 months

  // Calculate default range based on chartLimit
  const getDefaultRange = (limit: number): [dayjs.Dayjs, dayjs.Dayjs] => {
    return [dayjs().subtract(limit, 'months').startOf('month'), dayjs()];
  };

  // Initial filter state
  const initialFilters = {
    type: 'monthly',
    range: getDefaultRange(3),
    chartLimit: 3,
  };

  // Debounced API call
  const fetchRevenue = debounce(async (filters: any) => {
    setLoading(true);
    try {
      const params: any = { type: 'monthly' }; // Force monthly type
      if (filters.range) {
        params.from = filters.range[0].format('YYYY-MM-DD');
        params.to = filters.range[1].format('YYYY-MM-DD');
      }
      const res = await revenueApi.getDetails(params);
      setData(res.data.data || []);
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  }, 500);

  // Handle form submission
  const onFinish = (values: any) => {
    const [start, end] = values.range || [];
    if (start && end) {
      // Validate date range
      if (end.isAfter(dayjs(), 'day')) {
        message.error('Ngày kết thúc không thể ở tương lai');
        return;
      }
      if (start.isBefore(dayjs().subtract(2, 'years'), 'day')) {
        message.error('Chỉ hỗ trợ dữ liệu trong vòng 2 năm gần nhất');
        return;
      }
      if (end.diff(start, 'month') < 1) {
        message.error('Vui lòng chọn khoảng thời gian ít nhất 1 tháng');
        return;
      }
    }
    fetchRevenue(values);
    setChartLimit(values.chartLimit);
  };

  // Reset filters
  const onReset = () => {
    const resetFilters = {
      ...initialFilters,
      range: getDefaultRange(initialFilters.chartLimit),
    };
    form.setFieldsValue(resetFilters);
    fetchRevenue(resetFilters);
    setChartLimit(initialFilters.chartLimit);
  };

  // Update range when chartLimit changes
  useEffect(() => {
    const currentRange = form.getFieldValue('range');
    const newRange = getDefaultRange(chartLimit);
    if (!currentRange || currentRange[1].isSame(dayjs(), 'day')) {
      form.setFieldsValue({ range: newRange });
      fetchRevenue({ ...form.getFieldsValue(), range: newRange });
    }
  }, [chartLimit, form]);

  // Initialize form and fetch data
  useEffect(() => {
    form.setFieldsValue(initialFilters);
    fetchRevenue(initialFilters);
  }, []);

  const columns = [
    {
      title: 'Tháng',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('MM/YYYY'),
    },
    {
      title: 'Doanh thu bán hàng',
      dataIndex: 'salesRevenue',
      key: 'salesRevenue',
      render: (val: number) => `${val.toLocaleString()}₫`,
    },
    {
      title: 'Doanh thu dịch vụ',
      dataIndex: 'serviceRevenue',
      key: 'serviceRevenue',
      render: (val: number) => `${val.toLocaleString()}₫`,
    },
    {
      title: 'Tổng doanh thu',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (val: number) => `${val.toLocaleString()}₫`,
    },
  ];

  const renderChart = () => {
    const limitedData = data.slice(-chartLimit);

    const chartData = limitedData.map(item => ({
      date: item.date,
      salesRevenue: item.salesRevenue,
      serviceRevenue: item.serviceRevenue,
      totalRevenue: item.totalRevenue,
    }));

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => dayjs(date).format('MM/YYYY')}
            tick={{ fill: '#1E90FF' }}
          />
          <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M ₫`} />
          <Tooltip
            formatter={(value: number) => `${value.toLocaleString()}₫`}
            labelFormatter={(label) => dayjs(label).format('MM/YYYY')}
          />
          <Legend />
          <Bar name="Doanh thu bán hàng" dataKey="salesRevenue" fill="#8884d8" />
          <Bar name="Doanh thu dịch vụ" dataKey="serviceRevenue" fill="#82ca9d" />
          <Bar name="Tổng doanh thu" dataKey="totalRevenue" fill="#ffc658" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="p-6">
      <Title level={3}>Thống kê doanh thu</Title>

      <Form
        form={form}
        onFinish={onFinish}
        layout="inline"
        initialValues={initialFilters}
        className="mb-4"
      >
        <Space size="middle" wrap>
          <Form.Item
            label="Khoảng thời gian"
            name="range"
            rules={[{ required: true, message: 'Vui lòng chọn khoảng thời gian' }]}
          >
            <RangePicker
              format="DD/MM/YYYY"
              disabledDate={(current) =>
                current && (current > dayjs().endOf('day') || current < dayjs().subtract(2, 'years').startOf('day'))
              }
            />
          </Form.Item>

          <Form.Item label="Số tháng hiển thị" name="chartLimit">
            <Select style={{ width: 120 }} onChange={(value) => setChartLimit(value)}>
              <Option value={3}>3 tháng</Option>
              <Option value={6}>6 tháng</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Áp dụng
              </Button>
              <Button onClick={onReset}>Đặt lại</Button>
            </Space>
          </Form.Item>
        </Space>
      </Form>

      {form.getFieldValue('range') && (
        <Text type="secondary" className="block mb-2">
          Đang xem từ <b>{form.getFieldValue('range')[0].format('DD/MM/YYYY')}</b> đến{' '}
          <b>{form.getFieldValue('range')[1].format('DD/MM/YYYY')}</b>
        </Text>
      )}

      <Spin spinning={loading}>
        <div className="my-6">{renderChart()}</div>

        <Divider />

        <Table
          columns={columns}
          dataSource={data.slice(-chartLimit)}
          rowKey="date"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Spin>
    </div>
  );
};

export default RevenuePage;
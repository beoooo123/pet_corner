import { Request, Response } from 'express';
import paymentModel from '../models/paymentType.model.js'; // Assuming there's a Payment model

// Get all payments
export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const payments = await paymentModel.find();
    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get payment by ID
export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const payment = await paymentModel.findById(req.params.id);

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create new payment
export const insertPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { payment_type_name, description } = req.body;
    if (!payment_type_name || !description) {
      res.status(400).json({
        success: false,
        message: 'Payment type name is required'
      });
      return;
    }
    const payment = new paymentModel({
      payment_type_name,
      description
    });
    const savedPayment = await payment.save();

    res.status(201).json({
      success: true,
      data: savedPayment,
      message: 'Payment created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update payment
export const updatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const payment = await paymentModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete payment
export const deletePayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const payment = await paymentModel.findByIdAndDelete(req.params.id);

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

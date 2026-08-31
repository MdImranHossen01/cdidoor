'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AppointmentLetterPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEmployee() {
      try {
        const res = await fetch(`/api/admin/employees/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.employee) {
            setEmployee(data.employee);
          } else {
            toast.error('Employee not found');
            router.push('/dashboard');
          }
        } else {
          toast.error('Failed to load employee details');
        }
      } catch (error) {
        toast.error('Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      fetchEmployee();
    }
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-zinc-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-20 bg-zinc-50">
        <p className="text-zinc-500">Employee not found.</p>
        <Link href="/dashboard" className="text-primary hover:underline font-bold mt-2 inline-block">
          Go Back
        </Link>
      </div>
    );
  }

  const joinedDateFormatted = employee.joinedDate 
    ? new Date(employee.joinedDate).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-zinc-100 py-10 px-4 print:bg-white print:py-0 print:px-0">
      {/* Action Bar */}
      <div className="max-w-3xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button
          onClick={() => {
            if (typeof window !== 'undefined') window.history.back();
          }}
          className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors text-sm font-bold bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
        <Button
          onClick={() => window.print()}
          className="bg-primary text-primary-foreground font-bold flex items-center gap-2"
        >
          <Printer className="h-4 w-4" /> Print / Download PDF
        </Button>
      </div>

      {/* Appointment Letter Document */}
      <div className="max-w-3xl mx-auto bg-white border border-zinc-200 shadow-lg p-12 print:border-none print:shadow-none print:p-0 min-h-[297mm] font-serif text-zinc-800 leading-relaxed text-sm">
        {/* Company Header */}
        <div className="text-center border-b pb-6 mb-8 border-zinc-200">
          <h1 className="text-2xl font-black font-heading text-zinc-950 uppercase tracking-wide">{process.env.NEXT_PUBLIC_STORE_NAME || 'Store'}</h1>
          <p className="text-xs text-zinc-500 font-sans mt-1">Bangladesh | Phone: {process.env.NEXT_PUBLIC_SUPPORT_PHONE || '01700000000'} | Email: {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@store.com'}</p>
        </div>

        {/* Date & Address */}
        <div className="mb-6 font-sans text-xs text-zinc-600 flex justify-between">
          <div>Ref: {(process.env.NEXT_PUBLIC_STORE_NAME || 'Store').split(' ').map(w => w[0]).join('').toUpperCase()}/HR/AL-{employee._id?.slice(-6).toUpperCase()}</div>
          <div>Date: {currentDateFormatted}</div>
        </div>

        <div className="mb-8 font-sans">
          <div className="font-bold text-zinc-900">{employee.name}</div>
          {employee.phone && <div>Phone: {employee.phone}</div>}
          <div>Email: {employee.email}</div>
          <div className="mt-1">
            Designation: {employee.role === 'showroom_manager' ? 'Showroom Manager' : employee.role === 'manager' ? 'General Manager' : 'Employee'} ({employee.employeeType === 'monthly' ? 'Permanent / Monthly' : 'Contractual'})
          </div>
        </div>

        {/* Subject */}
        <div className="mb-6 font-sans font-bold text-zinc-900 uppercase border-b pb-1 text-center">
          Subject: Letter of Appointment
        </div>

        {/* Salutation & Body */}
        <div className="space-y-4 text-justify">
          <p>Dear {employee.name},</p>
          
          <p>
            With reference to your application and subsequent interview, we are pleased to offer you appointment as a 
            <strong> {employee.role === 'showroom_manager' ? 'Showroom Manager' : employee.role === 'manager' ? 'General Manager' : 'Staff Member'} ({employee.employeeType === 'monthly' ? 'Permanent' : 'Contractual'})</strong> at {process.env.NEXT_PUBLIC_STORE_NAME || 'Store'}, 
            effective from <strong>{joinedDateFormatted}</strong> under the following terms and conditions:
          </p>

          <ol className="list-decimal list-inside pl-2 space-y-3">
            <li>
              <strong>Scope of Work:</strong> You will be responsible for managing showroom operations, sales, customer relationships, or performing designated task assignments.
            </li>
            <li>
              <strong>Compensation & Remuneration:</strong> 
              {employee.employeeType === 'monthly' ? (
                <span> You will be paid a base monthly salary of <strong>৳{Number(employee.baseSalary || 0).toLocaleString()} / Month</strong>, subject to company policies and attendance. Payments are disbursed on a monthly schedule.</span>
              ) : (
                <span> You will be compensated on a per-task basis as agreed upon for each assigned task. No fixed monthly salary will be paid, and earnings depend purely on successfully assigned and completed tasks.</span>
              )}
            </li>
            <li>
              <strong>Working Hours & Attendance:</strong> Your general working hours and attendance will be maintained according to company operational schedule.
            </li>
            <li>
              <strong>Termination:</strong> Either party may terminate this employment agreement by giving a written notice of 15 days, or payment in lieu thereof.
            </li>
          </ol>

          <p className="pt-4">
            Please confirm your acceptance of this offer by signing and returning the duplicate copy of this letter. We look forward to a successful association.
          </p>
        </div>

        {/* Signatures */}
        <div className="mt-20 flex justify-between font-sans text-xs pt-10">
          <div>
            <div className="border-t border-zinc-400 w-48 pt-1 text-zinc-600">Authorized Signature</div>
            <div className="font-bold text-zinc-800">{process.env.NEXT_PUBLIC_STORE_NAME || 'Store'} HR</div>
          </div>
          <div className="text-right">
            <div className="border-t border-zinc-400 w-48 pt-1 text-zinc-600">Employee Signature</div>
            <div className="font-bold text-zinc-800">{employee.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

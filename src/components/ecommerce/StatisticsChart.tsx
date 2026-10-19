import { useEffect, useRef, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import flatpickr from "flatpickr";
import ChartTab from "../common/ChartTab";
import { CalenderIcon } from "../../icons";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function StatisticsChart() {
  const datePickerRef = useRef<HTMLInputElement>(null);
  const [registrations, setRegistrations] = useState<number[]>(new Array(12).fill(0));
  const [transactions, setTransactions] = useState<number[]>(new Array(12).fill(0));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivityData = async () => {
      try {
        const currentYear = new Date().getFullYear();

        // 1. Fetch user registration counts per month
        const usersSnap = await getDocs(collection(db, "users"));
        const regData = new Array(12).fill(0);
        usersSnap.forEach((doc) => {
          const data = doc.data();
          if (data.createdAt) {
            let date: Date;
            if (data.createdAt.toDate) {
              date = data.createdAt.toDate();
            } else {
              date = new Date(data.createdAt);
            }

            if (date.getFullYear() === currentYear) {
              const month = date.getMonth();
              regData[month]++;
            }
          }
        });
        setRegistrations(regData);

        // 2. Fetch approved reseller requests counts per month
        const reqsSnap = await getDocs(collection(db, "reseller_coin_requests"));
        const txData = new Array(12).fill(0);
        reqsSnap.forEach((doc) => {
          const data = doc.data();
          if (data.status === "approved" && data.timestamp) {
            let date: Date;
            if (data.timestamp.toDate) {
              date = data.timestamp.toDate();
            } else {
              date = new Date(data.timestamp);
            }

            if (date.getFullYear() === currentYear) {
              const month = date.getMonth();
              txData[month]++;
            }
          }
        });
        setTransactions(txData);

      } catch (error) {
        console.error("Error fetching activity chart stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivityData();
  }, []);

  useEffect(() => {
    if (!datePickerRef.current) return;

    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);

    const fp = flatpickr(datePickerRef.current, {
      mode: "range",
      static: true,
      monthSelectorType: "static",
      dateFormat: "M d",
      defaultDate: [sevenDaysAgo, today],
      clickOpens: true,
      prevArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 15L7.5 10L12.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      nextArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 15L12.5 10L7.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    });

    return () => {
      if (!Array.isArray(fp)) {
        fp.destroy();
      }
    };
  }, []);

  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontFamily: "Outfit",
    },
    colors: ["#465FFF", "#10B981"], // Blue for registrations, green for top-ups
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "area",
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: "smooth",
      width: [2, 2],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.35,
        opacityTo: 0,
      },
    },
    markers: {
      size: 4,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      x: {
        show: true,
      },
    },
    xaxis: {
      type: "category",
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"],
        },
      },
      title: {
        text: "",
        style: {
          fontSize: "0px",
        },
      },
    },
  };

  const series = [
    {
      name: "Registrations",
      data: registrations,
    },
    {
      name: "Coin Top-ups",
      data: transactions,
    },
  ];

  return (
    <div className="rounded-3xl border border-gray-200/50 bg-white/70 dark:bg-[#140e1b]/60 backdrop-blur-xl px-5 pb-5 pt-5 dark:border-white/[0.08] sm:px-6 sm:pt-6 hover:shadow-xl hover:shadow-purple-500/5 hover:border-purple-500/20 transition-all duration-300">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Platform Growth & Activity ({new Date().getFullYear()})
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            User registrations & approved reseller top-ups count
          </p>
        </div>
        <div className="flex items-center gap-3 sm:justify-end">
          <ChartTab />
          <div className="relative inline-flex items-center">
            <CalenderIcon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-3 lg:top-1/2 lg:translate-x-0 lg:-translate-y-1/2 size-5 text-gray-500 dark:text-gray-400 pointer-events-none z-10" />
            <input
              ref={datePickerRef}
              className="h-10 w-10 lg:w-40 lg:h-auto  lg:pl-10 lg:pr-3 lg:py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-transparent lg:text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:lg:text-gray-300 cursor-pointer"
              placeholder="Select date range"
            />
          </div>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          {loading ? (
            <div className="h-[310px] flex items-center justify-center text-sm text-gray-400">
              Loading statistics...
            </div>
          ) : (
            <Chart options={options} series={series} type="area" height={310} />
          )}
        </div>
      </div>
    </div>
  );
}

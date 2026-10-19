import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function MonthlySalesChart() {
  const [monthlyEarn, setMonthlyEarn] = useState<number[]>(new Array(12).fill(0));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMonthlyEarn = async () => {
      try {
        const snap = await getDocs(collection(db, "reseller_coin_requests"));
        const monthlyData = new Array(12).fill(0);
        const currentYear = new Date().getFullYear();

        snap.forEach((doc) => {
          const data = doc.data();
          if (data.status === "approved" && data.timestamp) {
            let date: Date;
            if (data.timestamp.toDate) {
              date = data.timestamp.toDate();
            } else {
              date = new Date(data.timestamp);
            }

            if (date.getFullYear() === currentYear) {
              const month = date.getMonth(); // 0-11
              monthlyData[month] += data.amount ?? 0;
            }
          }
        });

        setMonthlyEarn(monthlyData);
      } catch (error) {
        console.error("Error fetching monthly sales chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyEarn();
  }, []);

  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "39%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
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
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      title: {
        text: undefined,
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 1,
    },

    tooltip: {
      x: {
        show: false,
      },
      y: {
        formatter: (val: number) => `${val.toLocaleString()} Coins`,
      },
    },
  };
  const series = [
    {
      name: "Earned Coins",
      data: monthlyEarn,
    },
  ];
  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }
  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200/50 bg-white/70 dark:bg-[#140e1b]/60 backdrop-blur-xl px-5 pt-5 dark:border-white/[0.08] sm:px-6 sm:pt-6 hover:shadow-xl hover:shadow-purple-500/5 hover:border-purple-500/20 transition-all duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Monthly Earned Coins ({new Date().getFullYear()})
        </h3>
        <div className="relative inline-block">
          <button className="dropdown-toggle" onClick={toggleDropdown}>
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
          </button>
          <Dropdown
            isOpen={isOpen}
            onClose={closeDropdown}
            className="w-40 p-2"
          >
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View More
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Delete
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
          {loading ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">
              Loading chart...
            </div>
          ) : (
            <Chart options={options} series={series} type="bar" height={180} />
          )}
        </div>
      </div>
    </div>
  );
}

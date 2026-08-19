import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiClock, FiMessageSquare } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { formatDateLabel, minutesToHours } from '../../utils/format';

export default function TaskDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: res } = await axiosClient.get(`/tasks/${id}`);
        setReport(res.data.report);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load task details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingSpinner full label="Loading task details..." />;
  if (!report) return null;

  const eveningByRef = new Map((report.evening.tasks || []).map((e) => [String(e.taskRef), e]));

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Link to="/employee/my-tasks" className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800">
        <FiArrowLeft className="h-4 w-4" /> Back to My Tasks
      </Link>

      <div className="card p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-navy-800">{formatDateLabel(report.taskDate)}</h2>
          <p className="text-sm text-navy-400 mt-1">
            {report.summary.totalPlanned} planned · {report.summary.totalCompleted} completed · {report.summary.completionPercentage}% overall
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-navy-800 mb-4">Planned vs Completed Tasks</h3>
        <div className="space-y-3">
          {report.morning.tasks.map((t) => {
            const evening = eveningByRef.get(String(t._id));
            return (
              <div key={t._id} className="border border-navy-100 rounded-lg p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-navy-800">{t.title}</p>
                    {t.description && <p className="text-sm text-navy-400 mt-0.5">{t.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.priority} />
                    {evening && <StatusBadge status={evening.status} />}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                  <div>
                    <p className="text-xs text-navy-400">Expected By</p>
                    <p className="text-navy-700">{t.expectedCompletion || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-navy-400">Estimated Time</p>
                    <p className="text-navy-700 flex items-center gap-1"><FiClock className="h-3.5 w-3.5" /> {minutesToHours(t.estimatedTimeMinutes)}</p>
                  </div>
                  {evening && (
                    <>
                      <div>
                        <p className="text-xs text-navy-400">Completion</p>
                        <p className="text-navy-700">{evening.completionPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-navy-400">Actual Time</p>
                        <p className="text-navy-700 flex items-center gap-1"><FiClock className="h-3.5 w-3.5" /> {minutesToHours(evening.actualTimeSpentMinutes)}</p>
                      </div>
                    </>
                  )}
                </div>
                {evening?.remarks && <p className="text-sm text-navy-500 mt-2 italic">"{evening.remarks}"</p>}
              </div>
            );
          })}
        </div>
      </div>

      {report.reviewHistory?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-navy-800 mb-4 flex items-center gap-2"><FiMessageSquare className="h-4 w-4" /> Team Lead Remarks</h3>
          <div className="space-y-3">
            {report.reviewHistory.map((h, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <StatusBadge status={h.action === 'approved' ? 'approved' : 'needs_correction'} />
                <div>
                  <p className="text-navy-700">{h.remark || 'No remark provided.'}</p>
                  <p className="text-xs text-navy-400 mt-0.5">
                    {h.stage === 'morning' ? 'Morning review' : 'Evening review'} · {h.reviewedBy?.fullName || 'Team Lead'} · {new Date(h.reviewedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

package com.example.bearapp.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.example.bearapp.R;
import com.example.bearapp.models.Incident;
import java.util.List;

public class IncidentInboxAdapter extends RecyclerView.Adapter<IncidentInboxAdapter.IncidentViewHolder> {

    private List<Incident> incidentList;
    private OnItemClickListener listener;

    public interface OnItemClickListener {
        void onConfirmRouteClick(Incident incident);
        void onDismissClick(Incident incident, int position);
    }

    public IncidentInboxAdapter(List<Incident> incidentList, OnItemClickListener listener) {
        this.incidentList = incidentList;
        this.listener = listener;
    }

    @NonNull
    @Override
    public IncidentViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_incident_inbox, parent, false);
        return new IncidentViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull IncidentViewHolder holder, int position) {
        Incident incident = incidentList.get(position);
        holder.bind(incident, listener, position);
    }

    @Override
    public int getItemCount() {
        return incidentList.size();
    }

    static class IncidentViewHolder extends RecyclerView.ViewHolder {
        TextView title, details, residentName, contact;
        Button confirmButton, dismissButton;

        public IncidentViewHolder(@NonNull View itemView) {
            super(itemView);
            title = itemView.findViewById(R.id.tv_item_incident_title);
            details = itemView.findViewById(R.id.tv_item_incident_details);
            residentName = itemView.findViewById(R.id.tv_item_incident_resident_name);
            contact = itemView.findViewById(R.id.tv_item_incident_contact);
            confirmButton = itemView.findViewById(R.id.btn_item_confirm_route);
            dismissButton = itemView.findViewById(R.id.btn_item_dismiss);
        }

        public void bind(final Incident incident, final OnItemClickListener listener, final int position) {
            title.setText("New " + incident.getType() + " Incident");
            details.setText("Details: " + incident.getDescription());
            residentName.setText("Reported by: " + incident.getResidentName());
            contact.setText("Contact: " + incident.getResidentContact());

            confirmButton.setOnClickListener(v -> listener.onConfirmRouteClick(incident));
            dismissButton.setOnClickListener(v -> listener.onDismissClick(incident, position));
        }
    }
}

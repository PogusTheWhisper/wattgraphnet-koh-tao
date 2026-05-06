import torch
import torch.nn.functional as F
from torch_geometric_temporal import ASTGCN
from torch_geometric.utils import dense_to_sparse
from torch.utils.data import DataLoader, Dataset
from torch.amp import GradScaler, autocast
from tqdm.auto import tqdm
import numpy as np
import pandas as pd
import torch.nn as nn



# 6. ASTGCN with adaptive adjacency
class ASTGCN_V2(nn.Module):
    def __init__(self, num_nodes, **kwargs):
        super().__init__()
        self.astgcn    = ASTGCN(**kwargs)
        self.node_emb1 = nn.Parameter(torch.randn(num_nodes, 10))
        self.node_emb2 = nn.Parameter(torch.randn(10, num_nodes))

    def forward(self, x, edge_index=None):
        # learnable adjacency
        A_int    = F.relu(self.node_emb1 @ self.node_emb2)  # (N, N)
        A_adp    = F.softmax(A_int, dim=1)
        ei_adp, _ = dense_to_sparse(A_adp)
        # forward through ASTGCN
        out = self.astgcn(x, ei_adp.to(x.device))
        return F.relu(out)

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric_temporal import ASTGCN

class ASTGCN_V1_5(nn.Module):
    def __init__(self, num_nodes, **kwargs):
        super().__init__()
        self.astgcn = ASTGCN(**kwargs)

    def forward(self, x, edge_index):
        """
        x: [batch_size, num_nodes, num_features, num_timesteps]
        edge_index: Sparse graph connectivity (2, num_edges)
        """
        out = self.astgcn(x, edge_index)
        return F.relu(out)
class ASTGCN_V1(nn.Module):
    def __init__(self, num_nodes, **kwargs):
        super().__init__()
        self.astgcn = ASTGCN(**kwargs)

    def forward(self, x, edge_index):
        """
        x: [batch_size, num_nodes, num_features, num_timesteps]
        edge_index: Sparse graph connectivity (2, num_edges)
        """
        out = self.astgcn(x, edge_index)
        return out

# default_config_ASTGCN_V2 = {
#     "nb_block": 2,
#     "in_channels": 1,
#     "K": 2,
#     "nb_chev_filter": 64,
#     "nb_time_filter": 64,
#     "time_strides": 1,
#     "num_for_predict": pred_len,
#     "len_input": len_input,
#     "num_of_vertices": num_nodes,
#     "normalization": "sym",
#     "bias": True,
# }



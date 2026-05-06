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
class WattGraphNet_AAMm(nn.Module):
    def __init__(self, num_nodes, **kwargs):
        super().__init__()
        self.astgcn    = ASTGCN(**kwargs)
        self.node_emb1 = nn.Parameter(torch.randn(num_nodes, num_nodes*5))  # Increased to allow for more complex relationships
        self.node_emb2 = nn.Parameter(torch.randn(num_nodes*5, num_nodes))

    def forward(self, x, edge_index=None):
        # learnable adjacency
        A_int    = F.relu(self.node_emb1 @ self.node_emb2)  # (N, N)
        A_adp    = F.softmax(A_int, dim=1)
        ei_adp, _ = dense_to_sparse(A_adp)
        # forward through ASTGCN
        out = self.astgcn(x, ei_adp.to(x.device))
        return F.relu(out)